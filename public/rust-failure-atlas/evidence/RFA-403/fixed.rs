use std::{cell::Cell, rc::Rc};

struct Tracked(Rc<Cell<usize>>);

impl Drop for Tracked {
    fn drop(&mut self) {
        self.0.set(self.0.get() + 1);
    }
}

fn main() {
    let drops = Rc::new(Cell::new(0));
    let value = Tracked(Rc::clone(&drops));
    drop(value);
    assert_eq!(drops.get(), 1);
}
