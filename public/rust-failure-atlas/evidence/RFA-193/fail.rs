use std::collections::BinaryHeap;

fn main() {
    let heap = BinaryHeap::from([4, 1, 3, 2]);
    let values = heap.into_sorted_vec();

    assert_eq!(
        values,
        vec![4, 3, 2, 1],
        "BinaryHeap::into_sorted_vec returns ascending order although pop returns the greatest item"
    );
}
