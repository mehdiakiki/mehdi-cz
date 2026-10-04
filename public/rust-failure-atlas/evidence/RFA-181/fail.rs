use std::collections::VecDeque;

fn main() {
    let mut queue = VecDeque::with_capacity(4);
    queue.extend([1, 2, 3, 4]);
    queue.pop_front();
    queue.pop_front();
    queue.extend([5, 6]);

    let (first, second) = queue.as_slices();
    assert_eq!(first.len() + second.len(), 4);
    assert!(
        second.is_empty(),
        "VecDeque::as_slices may expose wrapped storage as two slices"
    );
}
