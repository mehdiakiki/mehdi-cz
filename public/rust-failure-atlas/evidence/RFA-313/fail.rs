use std::{collections::BinaryHeap, mem};

fn main() {
    let mut heap = BinaryHeap::from([1, 2, 3, 4]);
    let mut greatest = heap.peek_mut().unwrap();
    *greatest = 0;
    mem::forget(greatest);

    assert_eq!(
        heap.len(),
        4,
        "leaking a mutably dereferenced BinaryHeap PeekMut can leak other heap elements with the guard"
    );
}
