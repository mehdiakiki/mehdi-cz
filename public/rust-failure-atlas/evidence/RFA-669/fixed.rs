use std::collections::BinaryHeap;

fn main() {
    let heap = BinaryHeap::from([7, 2, 9, 4]);
    let ascending = heap.clone().into_sorted_vec();
    let descending: Vec<_> = std::iter::from_fn({ let mut h = heap; move || h.pop() }).collect();
    assert_eq!(ascending, [2, 4, 7, 9]);
    assert_eq!(descending, [9, 7, 4, 2]);
}
