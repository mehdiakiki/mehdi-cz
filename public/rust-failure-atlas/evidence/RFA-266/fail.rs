use std::sync::mpsc;

fn main() {
    let (sender, receiver) = mpsc::channel();
    sender.send("queued").unwrap();
    drop(sender);
    assert!(receiver.recv().is_err(), "Receiver::recv returns buffered messages before reporting disconnection");
}
