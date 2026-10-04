use std::collections::VecDeque;

fn rotate_wrapping<T>(values: &mut VecDeque<T>, amount: usize) {
    if !values.is_empty() {
        values.rotate_left(amount % values.len());
    }
}

fn main() {
    let mut values = VecDeque::from([1, 2, 3]);
    rotate_wrapping(&mut values, 4);
    assert_eq!(values, [2, 3, 1]);

    let mut empty: VecDeque<i32> = VecDeque::new();
    rotate_wrapping(&mut empty, 4);
    assert!(empty.is_empty());
}
