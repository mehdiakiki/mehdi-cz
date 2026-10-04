use std::sync::mpsc::{self, TryRecvError};

fn main() {
    let (sender, receiver) = mpsc::channel::<u8>();
    let hidden_sender = sender.clone();
    drop(sender);
    let result = receiver.try_recv();
    drop(hidden_sender);
    assert!(matches!(result, Err(TryRecvError::Disconnected)),
        "a channel remains connected while any Sender clone is alive");
}
