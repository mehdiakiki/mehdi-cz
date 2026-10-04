trait Outer {
    type Ty<'a, T: 'a + ?Sized>;
}

trait Inner {}

fn inspect<'r, T: Outer>(_: T::Ty<'r, dyn Inner>) {}

fn main() {}
