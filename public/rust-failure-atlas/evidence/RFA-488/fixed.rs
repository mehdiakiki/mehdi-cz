trait Read {}

type Reader<'a> = dyn Read + 'a;

fn main() {}
