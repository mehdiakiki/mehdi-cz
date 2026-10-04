#[allow(clippy::needless_return)]
fn answer() -> u8 {
    return 42;
}

fn main() {
    assert_eq!(answer(), 42);
}
