fn add_two(events: &mut Vec<&'static str>) {
    let mut add_from_callback = || events.push("callback");

    events.push("direct");
    add_from_callback();
}

fn main() {
    let mut events = Vec::new();
    add_two(&mut events);
}
