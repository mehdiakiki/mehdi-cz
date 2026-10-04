trait Read {}

type Reader<'a, 'b> = dyn Read + 'a + 'b;

fn main() {}
