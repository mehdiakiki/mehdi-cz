fn main() {
    let mut values = [1_u8, 3, 2, 4].into_iter();
    assert!(!values.by_ref().is_sorted());
    assert_eq!(values.next(), Some(4));
}
