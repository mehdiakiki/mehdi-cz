fn append_after_read(events: &mut Vec<String>) {
    let first = &events[0];
    let mut append = || events.push(String::from("completed"));

    println!("first event: {first}");
    append();
}

fn main() {
    let mut events = vec![String::from("started")];
    append_after_read(&mut events);
}
