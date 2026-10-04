use std::sync::mpsc;

fn main() {
    let generation_one = 1_u64;
    let (old_sender, old_receiver) = mpsc::channel::<u8>();

    let generation_two = 2_u64;
    let (visible_sender, _new_receiver) = mpsc::channel::<u8>();

    drop(old_sender);
    visible_sender.send(7).unwrap();

    assert!(
        old_receiver.recv().is_ok(),
        "receiver generation {generation_one} is closed although sender generation {generation_two} is alive"
    );
}
