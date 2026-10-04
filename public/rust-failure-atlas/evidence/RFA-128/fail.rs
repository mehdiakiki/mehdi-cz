use std::marker::PhantomData;

struct NoDefault;

#[derive(Default)]
struct Marker<T> {
    marker: PhantomData<T>,
}

fn main() {
    let _: Marker<NoDefault> = Marker::default();
}
