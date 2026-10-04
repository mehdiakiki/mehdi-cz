use std::sync::mpsc;
use std::thread;

fn main() {
    let (sender, receiver) = mpsc::sync_channel(0);
    let consumer = thread::spawn(move || receiver.recv().unwrap());

    sender.send("job").unwrap();
    assert_eq!(consumer.join().unwrap(), "job");
}
