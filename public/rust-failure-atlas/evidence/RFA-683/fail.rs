use std::sync::mpsc;

fn main() {
    let (sender, _receiver) = mpsc::sync_channel(0);
    assert!(sender.try_send(7_u8).is_ok(),
        "a zero-capacity sync_channel is a rendezvous and try_send is Full without a waiting receiver");
}
