trait Valid {}

impl Valid for u8 {}

impl<T: Valid> Valid for Vec<T> {}

fn require_valid<T: Valid>() {}

fn main() {
    require_valid::<u8>();
    require_valid::<Vec<Vec<u8>>>();
}
