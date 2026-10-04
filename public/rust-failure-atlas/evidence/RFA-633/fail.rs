enum Event {
    Message(String),
}

fn main() {
    let event = Event::Message(String::from("ready"));
    match event {
        Event::Message { text } => println!("{text}"),
    }
}
