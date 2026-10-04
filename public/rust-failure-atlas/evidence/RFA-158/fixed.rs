use std::cell::Cell;
use std::rc::Rc;

struct CountingIterator {
    values: std::vec::IntoIter<u8>,
    pulls: Rc<Cell<usize>>,
}

impl Iterator for CountingIterator {
    type Item = u8;

    fn next(&mut self) -> Option<Self::Item> {
        self.pulls.set(self.pulls.get() + 1);
        self.values.next()
    }
}

fn main() {
    let pulls = Rc::new(Cell::new(0));
    let source = CountingIterator {
        values: vec![10, 20].into_iter(),
        pulls: Rc::clone(&pulls),
    };
    let mut values = source.peekable();

    assert_eq!(values.peek(), Some(&10));
    assert_eq!(pulls.get(), 1);
    assert_eq!(values.peek(), Some(&10));
    assert_eq!(pulls.get(), 1);
    assert_eq!(values.next(), Some(10));
    assert_eq!(pulls.get(), 1);
}
