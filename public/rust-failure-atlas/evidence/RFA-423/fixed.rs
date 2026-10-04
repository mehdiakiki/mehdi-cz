use std::marker::PhantomData;

struct Handle<T> {
    id: u64,
    marker: PhantomData<fn() -> T>,
}

fn main() {
    let handle = Handle::<String> { id: 7, marker: PhantomData };
    assert_eq!(handle.id, 7);
}
