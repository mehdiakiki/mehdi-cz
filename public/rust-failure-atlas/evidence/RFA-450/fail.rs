enum Message {
    Data(u8),
    Empty,
}

fn main() {
    let message = Message::Data(7);
    match message {
        Message::Data(value) | Message::Empty => println!("{value}"),
    }
}
