use std::cell::Cell;
use std::cmp::Ordering;
use std::collections::BinaryHeap;
use std::rc::Rc;

#[derive(Clone, Eq, PartialEq)]
struct Priority(Rc<Cell<i32>>);

impl Ord for Priority {
    fn cmp(&self, other: &Self) -> Ordering {
        self.0.get().cmp(&other.0.get())
    }
}

impl PartialOrd for Priority {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

fn main() {
    let changed = Rc::new(Cell::new(10));
    let mut queue = BinaryHeap::new();
    queue.push(Priority(changed.clone()));
    queue.push(Priority(Rc::new(Cell::new(20))));

    changed.set(100);
    assert_eq!(100, queue.peek().unwrap().0.get(), "heap order was not repaired");
}
