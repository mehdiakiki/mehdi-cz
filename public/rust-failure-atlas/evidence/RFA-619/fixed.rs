#[repr(u8)]
enum Message {
    Empty = 0,
    Data(u8),
}

fn main() {
    assert_eq!(std::mem::discriminant(&Message::Empty), std::mem::discriminant(&Message::Empty));
}
