use std::collections::BinaryHeap;

fn main() {
    let mut queue = BinaryHeap::from([10, 20]);
    let values: Vec<_> = queue
        .drain()
        .map(|value| if value == 10 { 100 } else { value })
        .collect();
    queue.extend(values);

    assert_eq!(Some(&100), queue.peek());
}
