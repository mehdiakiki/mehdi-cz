use std::sync::mpsc;

fn main() {
    let (sender, receiver) = mpsc::channel();
    let mut available = receiver.try_iter();
    assert_eq!(available.next(), None);
    sender.send(7_u8).unwrap();
    assert_eq!(
        available.next(),
        None,
        "Receiver::try_iter can yield a value after an earlier None while a sender remains connected"
    );
}
