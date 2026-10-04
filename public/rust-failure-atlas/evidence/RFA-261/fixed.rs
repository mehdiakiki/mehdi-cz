fn main() {
    let mut values = [2_u8, 3, 4].into_iter();
    assert!(!values.by_ref().all(|value| value % 2 == 0));
    assert_eq!(values.next(), Some(4));
}
