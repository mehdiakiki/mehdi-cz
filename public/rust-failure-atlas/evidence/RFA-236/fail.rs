use std::thread;
use std::time::{Duration, Instant};

fn main() {
    let current = thread::current();
    current.unpark();
    current.unpark();

    thread::park();
    let started = Instant::now();
    thread::park_timeout(Duration::from_millis(30));
    assert!(
        started.elapsed() < Duration::from_millis(5),
        "Thread::unpark tokens do not accumulate beyond one"
    );
}
