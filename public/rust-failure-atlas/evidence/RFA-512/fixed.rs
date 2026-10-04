trait Identity: Sized {
    fn identity(self) -> Self {
        self
    }
}

impl<T> Identity for T {}

fn main() {
    assert_eq!(7.identity(), 7);
}
