use std::collections::BinaryHeap;

fn main() {
    let mut heap = BinaryHeap::from([9, 7, 8]);

    {
        let mut drained = heap.drain();
        assert!(drained.next().is_some());
    }

    assert_eq!(
        heap.len(),
        2,
        "dropping BinaryHeap::Drain drops every unconsumed element and leaves the heap empty"
    );
}
