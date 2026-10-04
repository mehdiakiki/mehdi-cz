use std::sync::mpsc::{self, TryRecvError};

fn main() {
    let (sender, receiver) = mpsc::channel();
    sender.send("first").unwrap();

    let pending = receiver.try_iter().collect::<Vec<_>>();
    assert_eq!(pending, vec!["first"]);
    assert_eq!(receiver.try_recv(), Err(TryRecvError::Empty));

    sender.send("later").unwrap();
    assert_eq!(receiver.try_recv(), Ok("later"));

    drop(sender);
    assert_eq!(receiver.try_recv(), Err(TryRecvError::Disconnected));
}
