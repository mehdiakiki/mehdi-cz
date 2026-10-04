trait Transport {
    fn name(&self) -> &'static str;
}

struct Tcp;

impl Transport for Tcp {
    fn name(&self) -> &'static str { "tcp" }
}

fn connect() -> dyn Transport {
    Tcp
}

fn main() {}
