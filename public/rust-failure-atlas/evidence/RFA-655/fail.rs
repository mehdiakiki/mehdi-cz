fn main() {
    let mut values = [10, 20, 30, 40].into_iter();
    assert_eq!(values.nth(1), Some(20));
    assert_eq!(values.next(), Some(20), "Iterator::nth consumes the selected item and every item before it");
}
