#[repr(u8)]
enum Message {
    Ready = 1,
    Data(u8) = 2,
}

fn main() {
    let values = [Message::Ready, Message::Data(7)];
    assert_eq!(values.len(), 2);
}
