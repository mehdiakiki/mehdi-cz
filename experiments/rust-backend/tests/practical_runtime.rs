use axum::{body::Body, extract::{Path, State}, http::{Request, StatusCode}, routing::post, Router};
use rust_backend_labs::{bounded_input::decoded_http, database, discard};
use std::{collections::HashMap, sync::{Arc, atomic::{AtomicUsize, Ordering}}, time::Duration};
use tokio::{sync::{mpsc, oneshot, Mutex, Semaphore}, task::JoinSet};
use tower::ServiceExt;

#[derive(Default)]
struct Cache { version: usize, value: usize }

async fn refresh(shared: Arc<Mutex<Cache>>, started: oneshot::Sender<()>, response: oneshot::Receiver<usize>) -> bool {
    let version = { shared.lock().await.version };
    started.send(()).unwrap();
    let response = response.await.unwrap();
    let mut state = shared.lock().await;
    if state.version == version {
        state.value = response;
        true
    } else { false }
}

#[tokio::test]
async fn refresh_releases_the_lock_and_does_not_overwrite_a_newer_version() {
    let shared = Arc::new(Mutex::new(Cache::default()));
    let (started, observed) = oneshot::channel();
    let (release, response) = oneshot::channel();
    let task = tokio::spawn(refresh(shared.clone(), started, response));
    observed.await.unwrap();
    { let mut state = shared.try_lock().expect("remote wait must not retain lock"); state.version = 1; state.value = 99; }
    release.send(12).unwrap();
    assert!(!task.await.unwrap());
    assert_eq!(shared.lock().await.value, 99);
    let (started, observed) = oneshot::channel();
    let (release, response) = oneshot::channel();
    let task = tokio::spawn(refresh(shared.clone(), started, response));
    observed.await.unwrap(); release.send(13).unwrap();
    assert!(task.await.unwrap()); assert_eq!(shared.lock().await.value,13);
    println!("MUTEX: second caller acquires during remote gate; stale response rejected; unchanged-version refresh applied=13");
}

struct Command { id: u32, reply: oneshot::Sender<()> }

async fn request_work(State(sender): State<mpsc::Sender<Command>>, Path(id): Path<u32>) -> StatusCode {
    let (reply, receive) = oneshot::channel();
    match sender.try_send(Command { id, reply }) {
        Ok(()) => if receive.await.is_ok() { StatusCode::OK } else { StatusCode::SERVICE_UNAVAILABLE },
        Err(mpsc::error::TrySendError::Full(_)) => StatusCode::TOO_MANY_REQUESTS,
        Err(mpsc::error::TrySendError::Closed(_)) => StatusCode::SERVICE_UNAVAILABLE,
    }
}

async fn work_request(app: Router, id: u32) -> StatusCode {
    app.oneshot(Request::post(format!("/work/{id}")).body(Body::empty()).unwrap()).await.unwrap().status()
}

#[tokio::test]
async fn queue_full_closed_and_completed_are_different_http_outcomes() {
    let (sender, mut receiver) = mpsc::channel::<Command>(1);
    let app = Router::new().route("/work/{id}",post(request_work)).with_state(sender.clone());
    let effects = Arc::new(Mutex::new(Vec::new()));
    let (started, observed) = oneshot::channel();
    let (release, wait) = oneshot::channel();
    let recorded = effects.clone();
    let worker = tokio::spawn(async move {
        let first = receiver.recv().await.unwrap();
        started.send(()).unwrap(); wait.await.unwrap();
        recorded.lock().await.push(first.id); let _ = first.reply.send(());
        while let Some(command) = receiver.recv().await {
            recorded.lock().await.push(command.id); let _ = command.reply.send(());
        }
    });
    let first = tokio::spawn(work_request(app.clone(),1));
    observed.await.unwrap();
    let second = tokio::spawn(work_request(app.clone(),2));
    tokio::time::timeout(Duration::from_secs(3),async { while sender.capacity()!=0 { tokio::task::yield_now().await; } }).await.unwrap();
    assert_eq!(work_request(app.clone(),3).await,StatusCode::TOO_MANY_REQUESTS);
    release.send(()).unwrap();
    assert_eq!(first.await.unwrap(),StatusCode::OK); assert_eq!(second.await.unwrap(),StatusCode::OK);
    worker.abort(); assert!(worker.await.unwrap_err().is_cancelled());
    assert_eq!(work_request(app,4).await,StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(*effects.lock().await,vec![1,2]);
    println!("ADMISSION: full=429; closed=503; admitted callers await completion=200; effects=[1,2], rejected=none");
}

struct RequestTask<T>(tokio::task::JoinHandle<T>);
impl<T> RequestTask<T> { async fn join(&mut self) -> Result<T,tokio::task::JoinError> { (&mut self.0).await } }
impl<T> Drop for RequestTask<T> { fn drop(&mut self) { self.0.abort(); } }
struct OnDrop(Option<oneshot::Sender<()>>);
impl Drop for OnDrop { fn drop(&mut self) { if let Some(signal)=self.0.take() { let _=signal.send(()); } } }

#[tokio::test]
async fn request_cancellation_and_lost_worker_reply_leave_committed_writes_observable() {
    let mut normal=RequestTask(tokio::spawn(async {42}));
    assert_eq!(normal.join().await.unwrap(),42);
    let pool = database("practical_runtime_outcomes").await;
    sqlx::query("CREATE TABLE operations (id integer PRIMARY KEY, state text NOT NULL)").execute(&pool).await.unwrap();
    let (committed, observed) = oneshot::channel();
    let (dropped, cancelled) = oneshot::channel();
    let worker_pool=pool.clone();
    let owner = RequestTask(tokio::spawn(async move {
        let _drop = OnDrop(Some(dropped));
        sqlx::query("INSERT INTO operations VALUES (1,'committed')").execute(&worker_pool).await.unwrap();
        committed.send(()).unwrap(); std::future::pending::<()>().await;
    }));
    observed.await.unwrap(); drop(owner);
    tokio::time::timeout(Duration::from_secs(3),cancelled).await.unwrap().unwrap();
    let state: String=sqlx::query_scalar("SELECT state FROM operations WHERE id=1").fetch_one(&pool).await.unwrap();
    assert_eq!(state,"committed");
    let (reply, receiver)=oneshot::channel::<Result<Vec<u8>,()>>(); drop(receiver);
    sqlx::query("INSERT INTO operations VALUES (2,'committed')").execute(&pool).await.unwrap();
    assert!(reply.send(Ok(b"stored outcome 2".to_vec())).is_err());
    let count: i64=sqlx::query_scalar("SELECT count(*) FROM operations WHERE state='committed'").fetch_one(&pool).await.unwrap();
    assert_eq!(count,2);
    println!("OWNERSHIP: request owner abort observed by drop marker; earlier write remains committed; disconnected receiver rejects reply but committed outcome 2 remains queryable");
    discard(pool,"practical_runtime_outcomes").await;
}

async fn fanout(input: std::ops::Range<usize>, limit: usize, gate: Arc<Semaphore>, started: mpsc::UnboundedSender<usize>, retained: Arc<AtomicUsize>) -> Vec<usize> {
    assert!(limit>0);
    struct Input(Arc<AtomicUsize>);
    impl Drop for Input { fn drop(&mut self) { self.0.fetch_sub(1,Ordering::SeqCst); } }
    let mut tasks=JoinSet::new(); let mut output=Vec::new();
    for id in input {
        if tasks.len()>=limit { output.push(tasks.join_next().await.unwrap().unwrap()); }
        let (gate,started,retained)=(gate.clone(),started.clone(),retained.clone());
        retained.fetch_add(1,Ordering::SeqCst);
        let input=Input(retained);
        tasks.spawn(async move {
            let _input=input;
            started.send(id).unwrap(); let permit=gate.acquire().await.unwrap(); permit.forget(); id
        });
    }
    while let Some(result)=tasks.join_next().await { output.push(result.unwrap()); }
    output
}

#[tokio::test]
async fn fanout_bounds_created_inputs_and_releases_them_on_parent_cancellation() {
    for cancel in [false,true] {
        let gate=Arc::new(Semaphore::new(0)); let retained=Arc::new(AtomicUsize::new(0));
        let (started,mut observed)=mpsc::unbounded_channel();
        let parent=tokio::spawn(fanout(0..20,3,gate.clone(),started,retained.clone()));
        for _ in 0..3 { observed.recv().await.unwrap(); }
        assert_eq!(retained.load(Ordering::SeqCst),3); assert!(observed.try_recv().is_err());
        if cancel {
            parent.abort(); assert!(parent.await.unwrap_err().is_cancelled());
            tokio::time::timeout(Duration::from_secs(3),async { while retained.load(Ordering::SeqCst)!=0 { tokio::task::yield_now().await; } }).await.unwrap();
        } else {
            gate.add_permits(20); let mut output=parent.await.unwrap(); output.sort(); assert_eq!(output,(0..20).collect::<Vec<_>>()); assert_eq!(retained.load(Ordering::SeqCst),0);
        }
    }
    println!("FANOUT: twenty lazy inputs, maximum three created before gate; completion yields all identities; cancelling parent releases admitted input owners");
}

struct Snapshot { generation: usize, dropped: Arc<Vec<AtomicUsize>>, _payload: Vec<u8> }
impl Drop for Snapshot { fn drop(&mut self) { self.dropped[self.generation].fetch_add(1,Ordering::SeqCst); } }

#[tokio::test]
async fn queued_snapshot_owners_release_each_generation_after_their_work_ends() {
    let counts=Arc::new((0..3).map(|_|AtomicUsize::new(0)).collect::<Vec<_>>());
    let make=|generation|Arc::new(Snapshot { generation,dropped:counts.clone(),_payload:vec![0;4096] });
    let mut current=make(0); let mut workers=HashMap::new(); let mut weak=Vec::new();
    for generation in 0..2 {
        weak.push(Arc::downgrade(&current)); let snapshot=current.clone();
        let (release,wait)=oneshot::channel();
        let worker=tokio::spawn(async move { wait.await.unwrap(); snapshot.generation });
        workers.insert(generation,(release,worker)); current=make(generation+1);
    }
    assert_eq!(weak[0].strong_count(),1); assert_eq!(weak[1].strong_count(),1);
    for generation in 0..2 {
        let (release,worker)=workers.remove(&generation).unwrap();release.send(()).unwrap();assert_eq!(worker.await.unwrap(),generation);
        assert_eq!(counts[generation].load(Ordering::SeqCst),1); assert!(weak[generation].upgrade().is_none());
    }
    drop(current); assert_eq!(counts[2].load(Ordering::SeqCst),1);
    println!("ARC: queued tasks retain generations 0 and 1 with one strong owner each; each payload destructor runs once when its task ends; current generation 2 releases separately");
}

fn reserve_one(remaining: &AtomicUsize) -> bool {
    remaining.fetch_update(Ordering::Relaxed,Ordering::Relaxed,|n|n.checked_sub(1)).is_ok()
}
struct Reservation(Arc<AtomicUsize>);
impl Reservation { fn claim(remaining: Arc<AtomicUsize>) -> Option<Self> { if reserve_one(&remaining) { Some(Self(remaining)) } else { None } } }
impl Drop for Reservation { fn drop(&mut self) { self.0.fetch_add(1,Ordering::Relaxed); } }

#[tokio::test]
async fn an_owned_reservation_returns_once_on_error_and_task_cancellation() {
    let remaining=Arc::new(AtomicUsize::new(1));
    { let _permit=Reservation::claim(remaining.clone()).unwrap(); assert!(Reservation::claim(remaining.clone()).is_none()); }
    assert_eq!(remaining.load(Ordering::Relaxed),1);
    let (started,observed)=oneshot::channel(); let counter=remaining.clone();
    let worker=tokio::spawn(async move { let _permit=Reservation::claim(counter).unwrap(); started.send(()).unwrap();std::future::pending::<()>().await; });
    observed.await.unwrap(); assert_eq!(remaining.load(Ordering::Relaxed),0);
    worker.abort(); assert!(worker.await.unwrap_err().is_cancelled()); assert_eq!(remaining.load(Ordering::Relaxed),1);
    println!("RESERVATION: owned capacity is exclusive; normal drop and awaited task cancellation each restore exactly one place");
}

#[tokio::test]
async fn http_collection_enforces_wire_decoded_and_deadline_limits() {
    use std::io::Write;
    use tokio::io::{AsyncReadExt,AsyncWriteExt};
    let mut gzip=flate2::write::GzEncoder::new(Vec::new(),flate2::Compression::default());gzip.write_all(&vec![b'x';1000]).unwrap();let gzip=gzip.finish().unwrap();
    let listener=tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();let address=listener.local_addr().unwrap();
    let server=tokio::spawn(async move {
        let mut tasks=JoinSet::new();
        loop { let (mut socket,_)=listener.accept().await.unwrap();let gzip=gzip.clone();tasks.spawn(async move {
            let mut request=[0;2048];let n=socket.read(&mut request).await.unwrap();let request=String::from_utf8_lossy(&request[..n]);
            if request.starts_with("GET /stall ") { std::future::pending::<()>().await; }
            let compressed=request.starts_with("GET /gzip ");let body=if compressed { gzip } else if request.starts_with("GET /exact ") { vec![b'x';16] } else { vec![b'x';17] };
            let encoding=if compressed { "Content-Encoding: gzip\r\n" } else { "" };
            let header=format!("HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n{encoding}Connection: close\r\n\r\n{:x}\r\n",body.len());
            let _=socket.write_all(header.as_bytes()).await;let _=socket.write_all(&body).await;let _=socket.write_all(b"\r\n0\r\n\r\n").await;
        }); }
    });
    for (path,accepted) in [("exact",true),("oversize",false),("gzip",false),("stall",false)] {
        let url=format!("http://{address}/{path}");let result=tokio::task::spawn_blocking(move ||decoded_http(&url,65536,16)).await.unwrap();
        assert_eq!(result.is_ok(),accepted,"{path}");if accepted { assert_eq!(result.unwrap().len(),16); }
    }
    server.abort();assert!(server.await.unwrap_err().is_cancelled());
    println!("BODY: chunked/no Content-Length exact=16 accepted; 17 rejected; gzip decoded expansion to 1000 rejected at decoded budget; stalled response hits client deadline");
}

#[test]
fn synchronous_drop_is_on_its_caller_while_explicit_blocking_cleanup_has_an_owner() {
    struct Cleanup { caller: std::thread::ThreadId, events: Arc<std::sync::Mutex<Vec<&'static str>>> }
    impl Drop for Cleanup { fn drop(&mut self) { assert_eq!(std::thread::current().id(),self.caller);self.events.lock().unwrap().push("drop"); } }
    let events=Arc::new(std::sync::Mutex::new(Vec::new()));
    { let _owner=Cleanup { caller:std::thread::current().id(),events:events.clone() };events.lock().unwrap().push("last-visible-work"); }
    events.lock().unwrap().push("after-scope");
    assert_eq!(*events.lock().unwrap(),vec!["last-visible-work","drop","after-scope"]);
    let runtime=tokio::runtime::Builder::new_current_thread().enable_all().build().unwrap();
    runtime.block_on(async {
        struct BlockingDrop { entered: std::sync::mpsc::Sender<()>, release: std::sync::mpsc::Receiver<()> }
        impl Drop for BlockingDrop { fn drop(&mut self) { self.entered.send(()).unwrap();self.release.recv().unwrap(); } }
        let progressed=Arc::new(AtomicUsize::new(0));let flag=progressed.clone();
        let other=tokio::spawn(async move { flag.store(1,Ordering::SeqCst); });
        let (entered,observed)=std::sync::mpsc::channel();let (release,wait)=std::sync::mpsc::channel();
        let flag=progressed.clone();let observer=std::thread::spawn(move || { observed.recv().unwrap();assert_eq!(flag.load(Ordering::SeqCst),0);release.send(()).unwrap(); });
        drop(BlockingDrop { entered, release:wait });other.await.unwrap();observer.join().unwrap();assert_eq!(progressed.load(Ordering::SeqCst),1);
        let (entered,observed)=oneshot::channel();let (release,wait)=std::sync::mpsc::channel();
        let cleanup=tokio::task::spawn_blocking(move || { entered.send(()).unwrap();wait.recv().unwrap(); });
        observed.await.unwrap();let other=tokio::spawn(async { 42 });assert_eq!(other.await.unwrap(),42);release.send(()).unwrap();cleanup.await.unwrap();
    });
    println!("DROP: caller thread order=last-visible-work,drop,after-scope; an explicitly owned blocking cleanup waits while another runtime task completes");
}
