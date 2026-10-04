use std::cell::Cell;
use std::mem::MaybeUninit;
use std::rc::Rc;

struct Tracked(Rc<Cell<usize>>);

impl Drop for Tracked {
    fn drop(&mut self) {
        self.0.set(self.0.get() + 1);
    }
}

fn main() {
    let drops = Rc::new(Cell::new(0));
    let mut slot = MaybeUninit::new(Tracked(Rc::clone(&drops)));
    slot.write(Tracked(Rc::clone(&drops)));

    unsafe { slot.assume_init_drop() };

    assert_eq!(
        drops.get(),
        2,
        "MaybeUninit::write overwrites initialized storage without dropping the old value"
    );
}
