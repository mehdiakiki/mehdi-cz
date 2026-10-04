use std::collections::VecDeque;

fn main() {
    let mut queue = VecDeque::from([10, 20, 30, 40]);
    assert_eq!(queue.swap_remove_front(2), Some(30));
    assert_eq!(
        queue,
        [10, 20, 40],
        "VecDeque::swap_remove_front does not preserve logical order"
    );
}
