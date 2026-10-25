#[allow(dead_code)]
mod common;

use common::{disk_stat, percentile};
use std::env;
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::sync::{Arc, Condvar, Mutex};
use std::thread;
use std::time::{Duration, Instant};

const RECORD: usize = 100;
const DISK: &str = "nvme0n1";

struct Queue {
    pending: Vec<u8>,
    next: u64,
    durable: u64,
    leader: bool,
    syncs: u64,
}

struct Log {
    file: Mutex<File>,
    queue: Mutex<Queue>,
    done: Condvar,
    delay: Duration,
}

impl Log {
    fn commit_alone(&self, record: &[u8]) {
        let mut file = self.file.lock().unwrap();
        file.write_all(record).expect("write");
        file.sync_data().expect("fdatasync");
        self.queue.lock().unwrap().syncs += 1;
    }

    fn commit_grouped(&self, record: &[u8]) {
        let mut q = self.queue.lock().unwrap();
        let mine = q.next;
        q.next += 1;
        q.pending.extend_from_slice(record);
        while q.durable <= mine {
            if q.leader {
                q = self.done.wait(q).unwrap();
                continue;
            }
            q.leader = true;
            if !self.delay.is_zero() {
                drop(q);
                thread::sleep(self.delay);
                q = self.queue.lock().unwrap();
            }
            let batch = std::mem::take(&mut q.pending);
            let upto = q.next;
            drop(q);
            let mut file = self.file.lock().unwrap();
            file.write_all(&batch).expect("write");
            file.sync_data().expect("fdatasync");
            drop(file);
            q = self.queue.lock().unwrap();
            q.durable = upto;
            q.leader = false;
            q.syncs += 1;
            self.done.notify_all();
        }
    }
}

fn run(strategy: &str, threads: usize, seconds: f64, path: &str, delay: Duration) {
    let _ = fs::remove_file(path);
    let file = OpenOptions::new().create(true).append(true).open(path).expect("open");
    let queue = Queue { pending: Vec::new(), next: 0, durable: 0, leader: false, syncs: 0 };
    let log = Arc::new(Log { file: Mutex::new(file), queue: Mutex::new(queue), done: Condvar::new(), delay });
    let deadline = Instant::now() + Duration::from_secs_f64(seconds);
    let disk0 = disk_stat(DISK);
    let start = Instant::now();
    let workers: Vec<_> = (0..threads)
        .map(|_| {
            let log = Arc::clone(&log);
            let grouped = strategy != "alone";
            thread::spawn(move || {
                let record = vec![b'r'; RECORD];
                let mut latencies = Vec::new();
                while Instant::now() < deadline {
                    let t = Instant::now();
                    if grouped { log.commit_grouped(&record) } else { log.commit_alone(&record) }
                    latencies.push(t.elapsed().as_secs_f64() * 1e6);
                }
                latencies
            })
        })
        .collect();
    let mut all: Vec<f64> = workers.into_iter().flat_map(|w| w.join().unwrap()).collect();
    let elapsed = start.elapsed().as_secs_f64();
    let disk1 = disk_stat(DISK);
    all.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let syncs = log.queue.lock().unwrap().syncs;
    println!(
        "  {strategy:<12} {threads:>2} writers: {:>6.0} records/s, p50 {:>6.0} us, p99 {:>6.0} us, {:>5.2} records per fdatasync, {:>5.2} disk flushes per 100 records",
        all.len() as f64 / elapsed,
        percentile(&all, 50.0),
        percentile(&all, 99.0),
        all.len() as f64 / syncs as f64,
        100.0 * (disk1.flushes - disk0.flushes) as f64 / all.len() as f64
    );
    fs::remove_file(path).expect("remove");
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let (strategy, path) = (args[1].as_str(), args[2].as_str());
    let delay = Duration::from_micros(if strategy == "group+delay" { 200 } else { 0 });
    for threads in [1, 2, 4, 8, 16] {
        run(strategy, threads, 1.0, path, delay);
    }
}
