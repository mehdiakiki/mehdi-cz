use std::{cell::Cell, rc::Rc, sync::Arc};

struct Payload {
    value: u8,
    clones: Rc<Cell<usize>>,
}

impl Clone for Payload {
    fn clone(&self) -> Self {
        self.clones.set(self.clones.get() + 1);
        Self { value: self.value, clones: Rc::clone(&self.clones) }
    }
}

fn main() {
    let clones = Rc::new(Cell::new(0));
    let shared = Arc::new(Payload { value: 7, clones: Rc::clone(&clones) });
    let other = Arc::clone(&shared);
    let owned = Arc::unwrap_or_clone(shared);
    assert_eq!(owned.value, 7);
    assert_eq!(clones.get(), 1);
    drop(other);

    let unique = Arc::new(Payload { value: 9, clones: Rc::clone(&clones) });
    assert_eq!(Arc::unwrap_or_clone(unique).value, 9);
    assert_eq!(clones.get(), 1);
}
