fn split_checked<T>(values: &mut Vec<T>, at: usize) -> Option<Vec<T>> {
    (at <= values.len()).then(|| values.split_off(at))
}

fn main() {
    let mut values = vec![10, 20, 30];
    assert!(split_checked(&mut values, 4).is_none());
    assert_eq!(values, vec![10, 20, 30]);
}
