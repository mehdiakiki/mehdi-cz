fn main() {
    let mut values = [1, 2].into_iter().peekable();
    assert_eq!(values.next_if(|value| *value == 9), None);
    assert_eq!(values.peek(), Some(&1));
    assert_eq!(values.next(), Some(1));
    assert_eq!(values.next_if_eq(&2), Some(2));
}
