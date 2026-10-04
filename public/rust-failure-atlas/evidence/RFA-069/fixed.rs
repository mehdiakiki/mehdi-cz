struct Wrapper<T>(T);

impl<T> From<T> for Wrapper<T> {
    fn from(value: T) -> Self {
        Self(value)
    }
}

fn main() {
    let wrapped = Wrapper::from(3_u8);
    assert_eq!(wrapped.0, 3);
}
