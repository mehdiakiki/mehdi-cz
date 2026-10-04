fn main() {
    let mut values = [1, 2].into_iter().peekable();
    assert_eq!(values.next_if(|value| *value == 9), None);
    assert_eq!(values.next(), Some(2), "next_if leaves a rejected next item in the iterator rather than consuming it");
}
