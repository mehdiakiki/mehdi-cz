mod telemetry {
    pub struct Event(pub &'static str);

    pub trait Render {
        fn render(&self) -> String;
    }

    impl Render for Event {
        fn render(&self) -> String {
            format!("event={}", self.0)
        }
    }
}

fn main() {
    let event = telemetry::Event("started");
    println!("{}", event.render());
}
