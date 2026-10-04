use std::collections::BinaryHeap;

fn main() {
    let mut heap = BinaryHeap::from([9, 7, 8]);

    let mut greatest = heap.peek_mut().expect("heap is not empty");
    *greatest = 1;
    drop(greatest);

    assert_eq!(
        heap.peek(),
        Some(&1),
        "dropping a modified PeekMut repairs the heap, so another element can become the root"
    );
}
