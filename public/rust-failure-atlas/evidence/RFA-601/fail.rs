trait Envelope<T> {}
trait Payload {}

fn accept(_value: impl Envelope<impl Payload>) {}

fn main() {}
