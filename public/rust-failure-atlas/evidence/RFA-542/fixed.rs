fn add_two(events: &mut Vec<&'static str>) {
    let add_from_callback = |target: &mut Vec<&'static str>| target.push("callback");

    events.push("direct");
    add_from_callback(events);
}

fn main() {
    let mut events = Vec::new();
    add_two(&mut events);
    assert_eq!(events, ["direct", "callback"]);
}
