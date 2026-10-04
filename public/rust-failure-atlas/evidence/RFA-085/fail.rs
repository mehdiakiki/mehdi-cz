fn main() {
    let [mut value] = &[41];
    value += 1;
    assert_eq!(value, 42);
}
