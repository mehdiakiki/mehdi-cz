struct Borrowed<'a, T>(&'a T);

type StaticUnit = Borrowed<(), 'static>;

fn main() {}
