fn archive(value: String) {
    println!("archived {} bytes", value.len());
}

fn main() {
    let payload = String::from("event-42");
    let event_id = &payload[6..];

    archive(payload);
    println!("event id: {event_id}");
}
