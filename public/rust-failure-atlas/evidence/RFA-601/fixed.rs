trait Envelope<T> {}
trait Payload {}

fn accept<T: Payload>(_value: impl Envelope<T>) {}

fn main() {}
