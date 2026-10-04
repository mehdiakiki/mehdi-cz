use std::collections::VecDeque;

fn main() {
    let mut queue = VecDeque::with_capacity(5);
    queue.extend([1, 2, 3, 4]);
    queue.pop_front();
    queue.extend([5, 6]);
    let before: Vec<_> = queue.iter().copied().collect();
    queue.make_contiguous();
    let after: Vec<_> = queue.iter().copied().collect();
    assert_ne!(before, after,
        "VecDeque::make_contiguous changes storage layout but preserves logical order");
}
