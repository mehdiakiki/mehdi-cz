use std::collections::BinaryHeap;

fn main() {
    let heap = BinaryHeap::from([1, 2, 3, 4]);
    let visited: Vec<_> = heap.iter().copied().collect();

    assert_eq!(
        visited,
        vec![4, 3, 2, 1],
        "BinaryHeap::iter visits the underlying heap representation in arbitrary order, not priority order"
    );
}
