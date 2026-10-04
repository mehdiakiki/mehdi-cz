use std::{cell::Cell, mem::{needs_drop, ManuallyDrop}, rc::Rc};

struct Tracked(Rc<Cell<usize>>);
impl Drop for Tracked {
    fn drop(&mut self) { self.0.set(self.0.get() + 1); }
}

fn main() {
    assert!(!needs_drop::<ManuallyDrop<Tracked>>());
    let drops = Rc::new(Cell::new(0));
    let mut value = ManuallyDrop::new(Tracked(Rc::clone(&drops)));
    unsafe { ManuallyDrop::drop(&mut value) };
    assert_eq!(drops.get(), 1);
}
