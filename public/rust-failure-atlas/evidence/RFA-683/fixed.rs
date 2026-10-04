use std::sync::mpsc;

fn main() {
    let (sender, receiver) = mpsc::sync_channel(0);
    std::thread::scope(|scope| {
        let worker = scope.spawn(move || receiver.recv().unwrap());
        sender.send(7_u8).unwrap();
        assert_eq!(worker.join().unwrap(), 7);
    });
}
