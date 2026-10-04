trait Flush {
    fn flush();
}

struct Sink;

impl Flush for Sink {
    fn flush() {}
}

fn main() {
    Sink::flush();
}
