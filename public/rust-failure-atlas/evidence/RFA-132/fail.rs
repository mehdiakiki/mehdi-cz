use std::cell::Cell;
use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::rc::Rc;

#[derive(Clone)]
struct Key(Rc<Cell<u32>>);

impl PartialEq for Key {
    fn eq(&self, other: &Self) -> bool {
        self.0.get() == other.0.get()
    }
}

impl Eq for Key {}

impl Hash for Key {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.0.get().hash(state);
    }
}

fn main() {
    let state = Rc::new(Cell::new(7));
    let mut jobs = HashMap::new();
    jobs.insert(Key(state.clone()), "queued");
    state.set(8);

    let lookup = Key(Rc::new(Cell::new(8)));
    assert_eq!(Some(&"queued"), jobs.get(&lookup), "mutated key became unreachable");
}
