use std::sync::mpsc::{self, RecvTimeoutError};
use std::time::Duration;

fn main() {
    let (sender, receiver) = mpsc::channel::<u8>();
    drop(sender);
    assert_eq!(
        receiver.recv_timeout(Duration::from_secs(60)),
        Err(RecvTimeoutError::Disconnected)
    );

    let (live_sender, live_receiver) = mpsc::channel::<u8>();
    assert_eq!(
        live_receiver.recv_timeout(Duration::ZERO),
        Err(RecvTimeoutError::Timeout)
    );
    drop(live_sender);
}
