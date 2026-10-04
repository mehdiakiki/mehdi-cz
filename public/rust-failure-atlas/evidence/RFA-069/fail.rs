struct Wrapper<T>(T);

impl<T> From<Wrapper<T>> for T {
    fn from(value: Wrapper<T>) -> T {
        value.0
    }
}

fn main() {}
