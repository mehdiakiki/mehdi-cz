use std::sync::mpsc::{self, RecvTimeoutError};
use std::time::Duration;

fn main() {
    let (sender, receiver) = mpsc::channel();
    let worker_sender = sender.clone();
    drop(sender);
    worker_sender.send("finished").unwrap();
    drop(worker_sender);

    assert_eq!(receiver.recv().unwrap(), "finished");
    assert!(matches!(
        receiver.recv_timeout(Duration::from_millis(10)),
        Err(RecvTimeoutError::Disconnected)
    ));
}
