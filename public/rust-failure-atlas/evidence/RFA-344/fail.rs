use std::sync::mpsc::{self, RecvTimeoutError};
use std::time::Duration;

fn main() {
    let (sender, receiver) = mpsc::channel::<u8>();
    drop(sender);

    assert_eq!(
        receiver.recv_timeout(Duration::from_secs(60)),
        Err(RecvTimeoutError::Timeout),
        "recv_timeout reports Disconnected immediately when no sender can ever produce another value"
    );
}
