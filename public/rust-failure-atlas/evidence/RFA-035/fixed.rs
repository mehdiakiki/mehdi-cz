use std::sync::mpsc;

struct ChannelGeneration<T> {
    id: u64,
    sender: mpsc::Sender<T>,
    receiver: mpsc::Receiver<T>,
}

fn channel_generation<T>(id: u64) -> ChannelGeneration<T> {
    let (sender, receiver) = mpsc::channel();
    ChannelGeneration {
        id,
        sender,
        receiver,
    }
}

fn main() {
    let channel = channel_generation::<u8>(2);
    channel.sender.send(7).unwrap();

    assert_eq!(channel.id, 2);
    assert_eq!(channel.receiver.recv().unwrap(), 7);
}
