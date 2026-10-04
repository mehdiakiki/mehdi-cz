struct Borrowed<'a, T>(&'a T);

type StaticUnit = Borrowed<'static, ()>;

static UNIT: () = ();

fn main() {
    let value: StaticUnit = Borrowed(&UNIT);
    let _ = value.0;
}
