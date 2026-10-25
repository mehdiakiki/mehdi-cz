use std::io::{Read, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::thread;
use std::time::{Duration, Instant};

const RUN: Duration = Duration::from_secs(20);
const STALL_EVERY: Duration = Duration::from_secs(5);
const STALL: Duration = Duration::from_millis(500);
const INTERVAL: Duration = Duration::from_millis(1);

/// Answers each 8-byte request with the same 8 bytes. Every STALL_EVERY,
/// starting at half of it, the next request waits STALL before its answer.
fn serve(listener: TcpListener) {
    let (mut conn, _) = listener.accept().expect("accept");
    conn.set_nodelay(true).expect("nodelay");
    let start = Instant::now();
    let mut next_stall = STALL_EVERY / 2;
    let mut buf = [0u8; 8];
    while conn.read_exact(&mut buf).is_ok() {
        if start.elapsed() >= next_stall {
            thread::sleep(STALL);
            next_stall += STALL_EVERY;
        }
        if conn.write_all(&buf).is_err() {
            break;
        }
    }
}

fn start_server() -> (SocketAddr, thread::JoinHandle<()>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind");
    let addr = listener.local_addr().expect("address");
    (addr, thread::spawn(move || serve(listener)))
}

fn connect(addr: SocketAddr) -> TcpStream {
    let s = TcpStream::connect(addr).expect("connect");
    s.set_nodelay(true).expect("nodelay");
    s
}

fn round_trip(s: &mut TcpStream, id: u64) {
    s.write_all(&id.to_le_bytes()).expect("write");
    let mut buf = [0u8; 8];
    s.read_exact(&mut buf).expect("read");
    assert_eq!(u64::from_le_bytes(buf), id);
}

/// Sends the next request as soon as the previous answer arrives.
fn closed(addr: SocketAddr) -> Vec<Duration> {
    let mut s = connect(addr);
    let start = Instant::now();
    let mut lat = Vec::new();
    for id in 0.. {
        if start.elapsed() >= RUN {
            break;
        }
        let t = Instant::now();
        round_trip(&mut s, id);
        lat.push(t.elapsed());
    }
    lat
}

/// Waits for each answer, and sends at most one request per INTERVAL.
/// Latency is measured from the moment the request was really sent.
fn paced(addr: SocketAddr) -> Vec<Duration> {
    let mut s = connect(addr);
    let start = Instant::now();
    let mut lat = Vec::new();
    let mut next = start;
    for id in 0.. {
        if let Some(wait) = next.checked_duration_since(Instant::now()) {
            thread::sleep(wait);
        }
        if start.elapsed() >= RUN {
            break;
        }
        let t = Instant::now();
        round_trip(&mut s, id);
        lat.push(t.elapsed());
        next = (next + INTERVAL).max(Instant::now());
    }
    lat
}

/// Sends one request per INTERVAL on a fixed schedule, without waiting for
/// answers. Latency is measured from the moment the request should have been sent.
fn open(addr: SocketAddr) -> Vec<Duration> {
    let s = connect(addr);
    let mut reader = s.try_clone().expect("clone");
    let mut writer = s;
    let start = Instant::now();
    let total = (RUN.as_micros() / INTERVAL.as_micros()) as u64;
    let sender = thread::spawn(move || {
        for id in 0..total {
            let intended = start + INTERVAL * id as u32;
            if let Some(wait) = intended.checked_duration_since(Instant::now()) {
                thread::sleep(wait);
            }
            writer.write_all(&id.to_le_bytes()).expect("write");
        }
        writer
    });
    let mut lat = Vec::with_capacity(total as usize);
    let mut buf = [0u8; 8];
    for id in 0..total {
        reader.read_exact(&mut buf).expect("read");
        assert_eq!(u64::from_le_bytes(buf), id);
        lat.push(Instant::now() - (start + INTERVAL * id as u32));
    }
    drop(sender.join().expect("sender"));
    lat
}

/// Adds the samples that a paced client did not send while it waited: for a
/// value above INTERVAL, also the values that decrease by INTERVAL, while they
/// stay above INTERVAL.
fn corrected(lat: &[Duration]) -> Vec<Duration> {
    let mut out = Vec::with_capacity(lat.len());
    for &l in lat {
        out.push(l);
        let mut missed = l;
        while missed > INTERVAL * 2 {
            missed -= INTERVAL;
            out.push(missed);
        }
    }
    out
}

fn report(name: &str, lat: &[Duration]) {
    let mut us: Vec<f64> = lat.iter().map(|d| d.as_nanos() as f64 / 1000.0).collect();
    us.sort_by(f64::total_cmp);
    let q = |p: f64| us[((us.len() - 1) as f64 * p).round() as usize];
    let mean = us.iter().sum::<f64>() / us.len() as f64;
    let slow = us.iter().filter(|&&x| x > 100_000.0).count();
    println!("{name}: {} requests, {slow} over 100 ms", us.len());
    println!(
        "  mean {:.0} us  p50 {:.0} us  p90 {:.0} us  p99 {:.0} us  p99.9 {:.0} us  p99.99 {:.0} us  max {:.0} us",
        mean,
        q(0.5),
        q(0.9),
        q(0.99),
        q(0.999),
        q(0.9999),
        us[us.len() - 1]
    );
}

fn main() {
    let mode = std::env::args().nth(1).expect("mode: closed, paced or open");
    let (addr, server) = start_server();
    let lat = match mode.as_str() {
        "closed" => closed(addr),
        "paced" => paced(addr),
        "open" => open(addr),
        other => panic!("unknown mode {}", other),
    };
    server.join().expect("server");
    report(&mode, &lat);
    if mode == "paced" {
        report("paced, corrected", &corrected(&lat));
    }
}
