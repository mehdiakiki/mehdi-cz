use std::collections::VecDeque;

fn main() {
    let mut values = VecDeque::with_capacity(8);
    values.extend(0..6);
    for _ in 0..3 {
        values.pop_front();
    }
    values.extend(6..9);

    assert_eq!(values.iter().copied().collect::<Vec<_>>(), [3, 4, 5, 6, 7, 8]);
    assert!(!values.as_slices().1.is_empty());
    assert_eq!(values.binary_search(&7), Ok(4));
}
