use std::sync::mpsc::{self, TryRecvError};

fn main() {
    let (sender, receiver) = mpsc::channel::<u8>();
    let extra = sender.clone();
    drop(sender);
    drop(extra);
    assert!(matches!(receiver.try_recv(), Err(TryRecvError::Disconnected)));
}
