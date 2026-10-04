use std::collections::BinaryHeap;

fn main() {
    let mut clear_everything = BinaryHeap::from([9, 7, 8]);
    {
        let mut drained = clear_everything.drain();
        assert!(drained.next().is_some());
    }
    assert!(clear_everything.is_empty());

    let mut keep_remainder = BinaryHeap::from([9, 7, 8]);
    assert_eq!(keep_remainder.pop(), Some(9));
    assert_eq!(keep_remainder.into_sorted_vec(), vec![7, 8]);
}
