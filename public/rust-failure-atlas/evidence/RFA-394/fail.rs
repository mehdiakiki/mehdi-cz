use std::{cell::Cell, rc::Rc};

struct Tracked(Rc<Cell<usize>>);
impl Drop for Tracked { fn drop(&mut self) { self.0.set(self.0.get() + 1); } }

fn main() {
    let drops = Rc::new(Cell::new(0));
    let mut slot = Tracked(Rc::clone(&drops));
    let old = std::mem::replace(&mut slot, Tracked(Rc::clone(&drops)));
    assert_eq!(drops.get(), 2, "mem::replace moves both values without dropping either one during the replacement call");
    drop(old);
    drop(slot);
}
