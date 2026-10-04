use std::collections::VecDeque;

fn main() {
    let mut queue = VecDeque::from([2, 3, 4, 5, 6]);
    let before: Vec<_> = queue.iter().copied().collect();
    let contiguous = queue.make_contiguous();
    assert_eq!(contiguous, before);
    assert_eq!(queue.as_slices().1, &[]);
}
