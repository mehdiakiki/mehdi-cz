use std::marker::PhantomData;

struct NoDefault;

struct Marker<T> {
    marker: PhantomData<T>,
}

impl<T> Default for Marker<T> {
    fn default() -> Self {
        Self { marker: PhantomData }
    }
}

fn main() {
    let _: Marker<NoDefault> = Marker::default();
}
