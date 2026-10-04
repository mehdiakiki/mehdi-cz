use std::marker::PhantomData;

#[repr(transparent)]
struct Measurement<U> {
    value: f32,
    unit: PhantomData<U>,
}

fn main() {
    assert_eq!(std::mem::size_of::<Measurement<()>>(), 4);
}
