use std::sync::mpsc::{self, RecvError};

fn main() {
    let (sender, receiver) = mpsc::channel();
    sender.send("queued").unwrap();
    drop(sender);
    assert_eq!(receiver.recv(), Ok("queued"));
    assert_eq!(receiver.recv(), Err(RecvError));
}
