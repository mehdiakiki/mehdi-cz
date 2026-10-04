use std::collections::BinaryHeap;

fn main() {
    let heap = BinaryHeap::from([4, 1, 3, 2]);
    assert_eq!(heap.into_sorted_vec(), vec![1, 2, 3, 4]);

    let mut heap = BinaryHeap::from([4, 1, 3, 2]);
    let priority_order = std::iter::from_fn(|| heap.pop()).collect::<Vec<_>>();
    assert_eq!(priority_order, vec![4, 3, 2, 1]);
}
