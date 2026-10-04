use std::marker::PhantomData;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct CacheKey<T> {
    raw: u64,
    marker: PhantomData<fn() -> T>,
}

impl<T> CacheKey<T> {
    fn new(raw: u64) -> Self {
        Self {
            raw,
            marker: PhantomData,
        }
    }
}

fn main() {
    let key = CacheKey::<String>::new(7);
    assert_eq!(key.raw, 7);
}
