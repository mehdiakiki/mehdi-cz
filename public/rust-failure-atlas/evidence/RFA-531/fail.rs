trait Project<'a> {
    type Output;
}

impl<'a, T: 'a> Project<'a> for T {
    type Output = &'a T;
}

struct Snapshot<'a, T> {
    value: <T as Project<'a>>::Output,
}

fn main() {}
