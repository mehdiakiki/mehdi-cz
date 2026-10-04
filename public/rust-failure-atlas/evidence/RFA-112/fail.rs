use std::sync::mpsc::{self, TrySendError};

fn main() {
    let (sender, _receiver) = mpsc::sync_channel(0);
    assert!(
        sender.try_send("job").is_ok(),
        "zero-capacity channel has no slot for try_send"
    );

    let _ = TrySendError::Full("job");
}
