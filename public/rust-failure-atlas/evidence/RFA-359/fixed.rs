use std::sync::mpsc::{self, TryRecvError};

fn main() {
    let (sender, receiver) = mpsc::channel();
    assert_eq!(receiver.try_recv(), Err(TryRecvError::Empty));

    let mut available = receiver.try_iter();
    assert_eq!(available.next(), None);
    sender.send(7_u8).unwrap();
    assert_eq!(available.next(), Some(7));

    drop(available);
    drop(sender);
    assert_eq!(receiver.try_recv(), Err(TryRecvError::Disconnected));
}
