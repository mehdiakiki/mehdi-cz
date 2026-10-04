use std::sync::mpsc;
use std::thread;

fn main() {
    let (release_tx, release_rx) = mpsc::channel();
    let (done_tx, done_rx) = mpsc::channel();

    let handle = thread::spawn(move || {
        release_rx.recv().unwrap();
        done_tx.send("completed").unwrap();
    });

    release_tx.send(()).unwrap();
    handle.join().unwrap();
    assert_eq!(done_rx.recv().unwrap(), "completed");
}
