trait Flush {
    fn flush();
}

struct Sink;

impl Flush for Sink {
    fn flush(&self) {}
}

fn main() {}
