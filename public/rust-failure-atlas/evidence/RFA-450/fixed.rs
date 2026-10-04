enum Message {
    Data(u8),
    Empty,
}

fn main() {
    let message = Message::Data(7);
    let text = match message {
        Message::Data(value) => value.to_string(),
        Message::Empty => String::from("empty"),
    };
    assert_eq!(text, "7");
}
