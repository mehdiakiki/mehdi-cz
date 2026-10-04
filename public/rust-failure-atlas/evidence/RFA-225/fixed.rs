use std::collections::VecDeque;

fn main() {
    let mut stable = VecDeque::from([10, 20, 30, 40]);
    assert_eq!(stable.remove(2), Some(30));
    assert_eq!(stable, [10, 20, 40]);

    let mut unordered = VecDeque::from([10, 20, 30, 40]);
    assert_eq!(unordered.swap_remove_front(2), Some(30));
    assert_eq!(unordered, [20, 10, 40]);
}
