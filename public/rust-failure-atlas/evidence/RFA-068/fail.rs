struct Marker;

impl<T> Marker {
    fn name() -> &'static str {
        std::any::type_name::<T>()
    }
}

fn main() {}
