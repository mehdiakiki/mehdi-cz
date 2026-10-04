use std::collections::BinaryHeap;

fn main() {
    let heap = BinaryHeap::from([1, 2, 3, 4]);
    let mut ordered = heap.clone();
    let mut priorities = Vec::new();

    while let Some(value) = ordered.pop() {
        priorities.push(value);
    }

    assert_eq!(priorities, vec![4, 3, 2, 1]);
    assert_eq!(heap.len(), 4);
}
