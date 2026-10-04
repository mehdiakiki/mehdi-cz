use std::collections::BinaryHeap;

fn main() {
    let mut heap = BinaryHeap::from([1, 2, 3, 4]);
    {
        let mut greatest = heap.peek_mut().unwrap();
        *greatest = 0;
    }

    assert_eq!(heap.len(), 4);
    assert_eq!(heap.into_sorted_vec(), [0, 1, 2, 3]);
}
