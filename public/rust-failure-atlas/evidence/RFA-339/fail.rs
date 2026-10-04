use std::collections::VecDeque;

fn wrapped_sorted_deque() -> VecDeque<i32> {
    let mut values = VecDeque::with_capacity(8);
    values.extend(0..6);
    for _ in 0..3 {
        values.pop_front();
    }
    values.extend(6..9);
    values
}

fn main() {
    let values = wrapped_sorted_deque();
    assert!(!values.as_slices().1.is_empty());

    assert!(
        values.binary_search(&7).is_err(),
        "VecDeque::binary_search follows logical order even when ring storage is split into two slices"
    );
}
