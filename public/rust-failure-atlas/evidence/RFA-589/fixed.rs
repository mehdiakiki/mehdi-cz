use std::marker::PhantomData;

struct Relation<'input, 'output, T>(PhantomData<(&'input (), &'output (), T)>)
where
    T: Convert<'input, 'output>;

trait Convert<'input, 'output>: Sized {
    fn shorten(&'input self) -> &'output Self;
}

impl<'long: 'short, 'short, T> Convert<'long, 'short> for T {
    fn shorten(&'long self) -> &'short T {
        self
    }
}

fn select<'input: 'output, 'output, T>(
    _relation: Relation<'input, 'output, T>,
    value: &'input T,
) -> &'output T {
    value.shorten()
}

fn main() {}
