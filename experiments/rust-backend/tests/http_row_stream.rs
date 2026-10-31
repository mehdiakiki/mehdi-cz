use axum::{body::{Body, Bytes}, routing::get, Router};
use futures_util::{stream, TryStreamExt};
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::{
    convert::Infallible,
    io,
    net::SocketAddr,
    pin::Pin,
    sync::{atomic::{AtomicBool, AtomicUsize, Ordering}, Arc, Mutex},
    task::{Context, Poll},
    time::Duration,
};
use tokio::{
    io::{AsyncBufReadExt, AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt, BufReader, ReadBuf},
    net::{TcpListener, TcpSocket, TcpStream},
    sync::{mpsc, oneshot, Notify, OwnedSemaphorePermit, Semaphore},
    task::{AbortHandle, JoinHandle},
    time::timeout,
};

const ROW_BYTES: usize = 4096;
const ROWS: i32 = 512;
const PAGE_ROWS: i32 = 4;
const PAGE_BYTES: usize = PAGE_ROWS as usize * ROW_BYTES;
const PAYLOAD_BUDGET: usize = 2 * PAGE_BYTES;

#[derive(Clone, Copy, Debug)]
enum Mode { RetainedStream, BoundedPages }

#[derive(Default)]
struct Observations {
    write_pending: AtomicBool,
    write_waits: AtomicUsize,
    socket_changed: Notify,
    decoded_rows: AtomicUsize,
    live_payload: AtomicUsize,
    peak_payload: AtomicUsize,
    payload_changed: Notify,
    body_dropped: AtomicBool,
    body_changed: Notify,
}

struct ReservedRow {
    data: Vec<u8>,
    reservation: Option<OwnedSemaphorePermit>,
    observations: Arc<Observations>,
}

impl AsRef<[u8]> for ReservedRow {
    fn as_ref(&self) -> &[u8] { &self.data }
}

impl Drop for ReservedRow {
    fn drop(&mut self) {
        let bytes = self.data.len();
        drop(std::mem::take(&mut self.data));
        drop(self.reservation.take());
        self.observations.live_payload.fetch_sub(bytes, Ordering::SeqCst);
        self.observations.payload_changed.notify_one();
    }
}

fn owned_row(body: String, reservation: OwnedSemaphorePermit, observed: &Arc<Observations>) -> Bytes {
    assert_eq!(body.len(), ROW_BYTES);
    assert_eq!(reservation.num_permits(), ROW_BYTES);
    let live = observed.live_payload.fetch_add(ROW_BYTES, Ordering::SeqCst) + ROW_BYTES;
    observed.peak_payload.fetch_max(live, Ordering::SeqCst);
    observed.decoded_rows.fetch_add(1, Ordering::SeqCst);
    // The reservation survives clones and slices held by the HTTP stack.
    Bytes::from_owner(ReservedRow {
        data: body.into_bytes(),
        reservation: Some(reservation),
        observations: observed.clone(),
    })
}

async fn produce(
    pool: PgPool,
    mode: Mode,
    budget: Arc<Semaphore>,
    sender: mpsc::Sender<Bytes>,
    observed: Arc<Observations>,
) -> Result<(), sqlx::Error> {
    match mode {
        Mode::RetainedStream => {
            let mut connection = pool.acquire().await?;
            let mut rows = sqlx::query_as::<_, (i32, String)>(
                "SELECT i, lpad(i::text, 8, '0') || repeat('x', 4087) || chr(10) \
                 FROM generate_series(1, $1::int) AS i",
            ).bind(ROWS).fetch(&mut *connection);
            loop {
                let reservation = budget.clone().acquire_many_owned(ROW_BYTES as u32).await.unwrap();
                let Some((_, body)) = rows.try_next().await? else { break };
                if sender.send(owned_row(body, reservation, &observed)).await.is_err() {
                    return Ok(());
                }
            }
        }
        Mode::BoundedPages => {
            let mut first = 1;
            while first <= ROWS {
                // article:http-page:start
                let mut reservation = budget.clone()
                    .acquire_many_owned(PAGE_BYTES as u32).await.unwrap();
                let page: Vec<(i32, String)> = sqlx::query_as(
                    "SELECT i, lpad(i::text, 8, '0') || repeat('x', 4087) || chr(10) \
                     FROM generate_series($1::int, $2::int) AS i",
                )
                .bind(first)
                .bind((first + PAGE_ROWS - 1).min(ROWS))
                .fetch_all(&pool)
                .await?;
                // article:http-page:end
                // fetch_all has returned the checkout before a slow send.
                for (_, body) in page {
                    let row_reservation = reservation.split(ROW_BYTES).unwrap();
                    if sender.send(owned_row(body, row_reservation, &observed)).await.is_err() {
                        return Ok(());
                    }
                }
                first += PAGE_ROWS;
            }
        }
    }
    Ok(())
}

struct StopProducer {
    producer: AbortHandle,
    observations: Arc<Observations>,
}

// article:http-cancel:start
impl Drop for StopProducer {
    fn drop(&mut self) {
        self.producer.abort();
        self.observations.body_dropped.store(true, Ordering::SeqCst);
        self.observations.body_changed.notify_one();
    }
}
// article:http-cancel:end

// Observe a real socket write returning Pending. No artificial producer gate.
struct ObservedSocket {
    socket: TcpStream,
    observations: Arc<Observations>,
}

impl AsyncRead for ObservedSocket {
    fn poll_read(mut self: Pin<&mut Self>, cx: &mut Context<'_>, buffer: &mut ReadBuf<'_>) -> Poll<io::Result<()>> {
        Pin::new(&mut self.socket).poll_read(cx, buffer)
    }
}

impl AsyncWrite for ObservedSocket {
    fn poll_write(mut self: Pin<&mut Self>, cx: &mut Context<'_>, bytes: &[u8]) -> Poll<io::Result<usize>> {
        let result = Pin::new(&mut self.socket).poll_write(cx, bytes);
        self.observations.write_pending.store(result.is_pending(), Ordering::SeqCst);
        if result.is_pending() {
            self.observations.write_waits.fetch_add(1, Ordering::SeqCst);
            self.observations.socket_changed.notify_one();
        }
        result
    }
    fn poll_flush(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<io::Result<()>> {
        Pin::new(&mut self.socket).poll_flush(cx)
    }
    fn poll_shutdown(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<io::Result<()>> {
        Pin::new(&mut self.socket).poll_shutdown(cx)
    }
}

struct ObservedListener {
    listener: TcpListener,
    observations: Arc<Observations>,
}

impl axum::serve::Listener for ObservedListener {
    type Io = ObservedSocket;
    type Addr = SocketAddr;
    async fn accept(&mut self) -> (Self::Io, Self::Addr) {
        let (socket, address) = self.listener.accept().await.unwrap();
        socket2::SockRef::from(&socket).set_send_buffer_size(16 * 1024).unwrap();
        (ObservedSocket { socket, observations: self.observations.clone() }, address)
    }
    fn local_addr(&self) -> io::Result<Self::Addr> { self.listener.local_addr() }
}

type Producer = JoinHandle<Result<(), sqlx::Error>>;

async fn start_server(
    pool: &PgPool,
    mode: Mode,
    budget: &Arc<Semaphore>,
    observed: &Arc<Observations>,
) -> (SocketAddr, JoinHandle<()>, oneshot::Receiver<Producer>) {
    let pool = pool.clone();
    let budget = budget.clone();
    let observed_route = observed.clone();
    let (started, producer) = oneshot::channel();
    let started = Arc::new(Mutex::new(Some(started)));
    let app = Router::new().route("/export", get(move || {
        let pool = pool.clone();
        let budget = budget.clone();
        let observed = observed_route.clone();
        let started = started.clone();
        async move {
            let (sender, receiver) = mpsc::channel(1);
            let task = tokio::spawn(produce(pool, mode, budget, sender, observed.clone()));
            let guard = StopProducer { producer: task.abort_handle(), observations: observed };
            started.lock().unwrap().take().unwrap().send(task).unwrap();
            Body::from_stream(stream::unfold((receiver, guard), |(mut receiver, guard)| async move {
                receiver.recv().await.map(|row| (Ok::<_, Infallible>(row), (receiver, guard)))
            }))
        }
    }));
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let listener = ObservedListener { listener, observations: observed.clone() };
    let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap(); });
    (address, server, producer)
}

async fn connect_client(address: SocketAddr) -> BufReader<TcpStream> {
    let socket = TcpSocket::new_v4().unwrap();
    socket.set_recv_buffer_size(16 * 1024).unwrap();
    let mut socket = socket.connect(address).await.unwrap();
    socket.write_all(b"GET /export HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n").await.unwrap();
    let mut client = BufReader::new(socket);
    let mut header = String::new();
    loop {
        let count = client.read_line(&mut header).await.unwrap();
        assert!(count > 0 && header.len() <= 8192);
        if header.ends_with("\r\n\r\n") { break; }
    }
    assert!(header.starts_with("HTTP/1.1 200"), "{header}");
    assert!(header.to_ascii_lowercase().contains("transfer-encoding: chunked"));
    client
}

async fn read_row(client: &mut BufReader<TcpStream>, expected: i32) -> bool {
    let mut line = String::new();
    assert!(client.read_line(&mut line).await.unwrap() > 0);
    let length = usize::from_str_radix(line.trim(), 16).unwrap();
    if length == 0 {
        line.clear();
        client.read_line(&mut line).await.unwrap();
        assert_eq!(line, "\r\n");
        return false;
    }
    assert_eq!(length, ROW_BYTES);
    let mut data = [0_u8; ROW_BYTES];
    client.read_exact(&mut data).await.unwrap();
    assert_eq!(&data[..8], format!("{expected:08}").as_bytes());
    assert!(data[8..ROW_BYTES - 1].iter().all(|byte| *byte == b'x'));
    assert_eq!(data[ROW_BYTES - 1], b'\n');
    let mut crlf = [0; 2];
    client.read_exact(&mut crlf).await.unwrap();
    assert_eq!(&crlf, b"\r\n");
    true
}

async fn wait_for_socket_pressure(observed: &Observations) {
    loop {
        let changed = observed.socket_changed.notified();
        if observed.write_pending.load(Ordering::SeqCst) { return; }
        changed.await;
    }
}

async fn wait_for_body_drop(observed: &Observations) {
    loop {
        let changed = observed.body_changed.notified();
        if observed.body_dropped.load(Ordering::SeqCst) { return; }
        changed.await;
    }
}

async fn wait_for_payload_release(observed: &Observations) {
    loop {
        let changed = observed.payload_changed.notified();
        if observed.live_payload.load(Ordering::SeqCst) == 0 { return; }
        changed.await;
    }
}

async fn run_case(mode: Mode, disconnect: bool) {
    let pool = PgPoolOptions::new().max_connections(1)
        .connect(&std::env::var("SQL_RUST_PG_URL").unwrap()).await.unwrap();
    let budget = Arc::new(Semaphore::new(PAYLOAD_BUDGET));
    let observed = Arc::new(Observations::default());
    let (address, server, producer) = start_server(&pool, mode, &budget, &observed).await;
    let mut client = connect_client(address).await;
    let producer = producer.await.unwrap();
    assert!(read_row(&mut client, 1).await);
    // The test now stops reading. Wait for actual transport pressure.
    timeout(Duration::from_secs(8), wait_for_socket_pressure(&observed)).await.unwrap();
    assert!(observed.decoded_rows.load(Ordering::SeqCst) < ROWS as usize);
    assert!(!producer.is_finished());
    match mode {
        Mode::RetainedStream => {
            assert!(timeout(Duration::from_millis(250), pool.acquire()).await.is_err());
        }
        Mode::BoundedPages => {
            let value: i32 = timeout(Duration::from_secs(5),
                sqlx::query_scalar("SELECT 7").fetch_one(&pool)).await.unwrap().unwrap();
            assert_eq!(value, 7);
        }
    }
    let paused_rows = observed.decoded_rows.load(Ordering::SeqCst);
    assert!(paused_rows < ROWS as usize);
    if !disconnect {
        for expected in 2..=ROWS { assert!(read_row(&mut client, expected).await); }
        assert!(!read_row(&mut client, ROWS + 1).await);
    }
    drop(client);
    timeout(Duration::from_secs(8), wait_for_body_drop(&observed)).await.unwrap();
    match timeout(Duration::from_secs(8), producer).await.unwrap() {
        Ok(result) => result.unwrap(),
        Err(error) => assert!(disconnect && error.is_cancelled(), "{error}"),
    }
    timeout(Duration::from_secs(8), wait_for_payload_release(&observed)).await.unwrap();
    assert_eq!(budget.available_permits(), PAYLOAD_BUDGET);
    let value: i32 = timeout(Duration::from_secs(5),
        sqlx::query_scalar("SELECT 99").fetch_one(&pool)).await.unwrap().unwrap();
    assert_eq!(value, 99);
    let peak = observed.peak_payload.load(Ordering::SeqCst);
    assert!(peak > 0 && peak <= PAYLOAD_BUDGET);
    if !disconnect { assert_eq!(observed.decoded_rows.load(Ordering::SeqCst), ROWS as usize); }
    println!("HTTP_ROW_STREAM: mode={mode:?}; disconnect={disconnect}; real socket write pending; decoded while client paused={paused_rows}/{ROWS}; peak owned HTTP payload={peak}/{PAYLOAD_BUDGET} bytes; producer joined; payload and permits released; final query=99");
    server.abort();
    assert!(server.await.unwrap_err().is_cancelled());
    pool.close().await;
}

#[tokio::test]
async fn streaming_a_query_retains_the_checkout_until_http_disconnects() {
    timeout(Duration::from_secs(30), run_case(Mode::RetainedStream, true)).await.unwrap();
}

#[tokio::test]
async fn bounded_pages_free_the_pool_during_a_slow_http_download() {
    timeout(Duration::from_secs(30), run_case(Mode::BoundedPages, false)).await.unwrap();
}

#[tokio::test]
async fn disconnecting_a_paged_download_stops_its_producer_and_returns_its_budget() {
    timeout(Duration::from_secs(30), run_case(Mode::BoundedPages, true)).await.unwrap();
}
