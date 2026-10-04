struct Marker;

impl Marker {
    fn name<T>() -> &'static str {
        std::any::type_name::<T>()
    }
}

fn main() {
    assert_eq!(Marker::name::<u8>(), "u8");
}
