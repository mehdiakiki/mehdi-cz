use std::sync::mpsc::{self, TryRecvError};

fn main() {
    let (sender, receiver) = mpsc::channel();
    sender.send("first").unwrap();

    let pending = receiver.try_iter().collect::<Vec<_>>();
    let state_after_snapshot = receiver.try_recv();

    sender.send("later").unwrap();
    let later_message = receiver.try_recv();

    assert_eq!(pending, vec!["first"]);
    assert_eq!(later_message, Ok("later"));
    assert_eq!(
        state_after_snapshot,
        Err(TryRecvError::Disconnected),
        "try_iter stops at temporary emptiness while senders can still publish"
    );
}
