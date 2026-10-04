fn append_after_read(events: &mut Vec<String>) {
    let first = &events[0];
    println!("first event: {first}");

    let mut append = || events.push(String::from("completed"));
    append();
}

fn main() {
    let mut events = vec![String::from("started")];
    append_after_read(&mut events);
    assert_eq!(events.len(), 2);
}
