use std::collections::BinaryHeap;

fn main() {
    let mut heap = BinaryHeap::from([9, 7, 8]);

    {
        let mut greatest = heap.peek_mut().expect("heap is not empty");
        assert_eq!(*greatest, 9);
        *greatest = 1;
    }

    assert_eq!(heap.peek(), Some(&8));
    assert_eq!(heap.into_sorted_vec(), vec![1, 7, 8]);
}
