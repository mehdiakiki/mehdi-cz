use std::collections::BinaryHeap;

fn main() {
    let heap = BinaryHeap::from([7, 2, 9, 4]);
    let sorted = heap.clone().into_sorted_vec();
    let popped: Vec<_> = std::iter::from_fn({ let mut h = heap; move || h.pop() }).collect();
    assert_eq!(sorted, popped,
        "BinaryHeap::into_sorted_vec is ascending while repeated pop yields greatest first");
}
