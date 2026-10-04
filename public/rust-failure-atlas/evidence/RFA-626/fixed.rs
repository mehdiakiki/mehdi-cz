trait Transport {
    fn name(&self) -> &'static str;
}

struct Tcp;

impl Transport for Tcp {
    fn name(&self) -> &'static str { "tcp" }
}

fn connect() -> Box<dyn Transport> {
    Box::new(Tcp)
}

fn main() {
    assert_eq!(connect().name(), "tcp");
}
