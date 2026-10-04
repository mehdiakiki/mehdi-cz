use std::sync::mpsc;
use std::sync::{Arc, OnceLock};
use std::thread;

fn main() {
    let value = Arc::new(OnceLock::new());
    let worker_value = Arc::clone(&value);
    let (started_tx, started_rx) = mpsc::channel();
    let (release_tx, release_rx) = mpsc::channel();

    let worker = thread::spawn(move || {
        worker_value.get_or_init(|| {
            started_tx.send(()).unwrap();
            release_rx.recv().unwrap();
            42_u32
        });
    });

    started_rx.recv().unwrap();
    assert_eq!(value.get(), None);
    release_tx.send(()).unwrap();
    assert_eq!(value.wait(), &42);
    worker.join().unwrap();
}
