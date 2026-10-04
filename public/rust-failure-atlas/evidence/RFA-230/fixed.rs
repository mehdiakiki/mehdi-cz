fn main() {
    let values = [10, 20, 30, 40];
    let mut iterator = values.iter();
    assert_eq!(iterator.as_slice().get(2), Some(&30));
    assert_eq!(iterator.next(), Some(&10));

    let mut consuming = values.into_iter();
    assert_eq!(consuming.nth(2), Some(30));
    assert_eq!(consuming.next(), Some(40));
}
