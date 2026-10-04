trait Valid {}

impl<T> Valid for T
where
    Vec<T>: Valid,
{}

fn require_valid<T: Valid>() {}

fn main() {
    require_valid::<u8>();
}
