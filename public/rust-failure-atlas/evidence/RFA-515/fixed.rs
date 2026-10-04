fn run<T: Default>() -> T {
    T::default()
}

fn main() {
    let value: u8 = run();
    assert_eq!(value, 0);
}
