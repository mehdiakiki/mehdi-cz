trait Contains<T> {}
trait Token {}

fn accept(_value: impl Contains<impl Token>) {}

fn main() {}
