use std::sync::mpsc;
use std::thread;
use std::time::Duration;

fn main() {
    let (release_tx, release_rx) = mpsc::channel();
    let (done_tx, done_rx) = mpsc::channel();

    let handle = thread::spawn(move || {
        release_rx.recv().unwrap();
        done_tx.send("completed").unwrap();
    });

    drop(handle);
    release_tx.send(()).unwrap();

    assert!(
        done_rx.recv_timeout(Duration::from_secs(2)).is_err(),
        "dropping JoinHandle detaches the thread instead of cancelling it"
    );
}
