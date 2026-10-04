enum Event { Ready }

impl Event {
    fn new() -> Self { Self::Ready }
}

fn main() {
    match Event::new() {
        Event::Ready => {}
    }
}
