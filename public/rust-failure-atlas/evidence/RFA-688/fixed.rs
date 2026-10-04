use std::panic::{AssertUnwindSafe, catch_unwind};
use std::sync::Once;

fn main() {
    let once = Once::new();
    let _ = catch_unwind(AssertUnwindSafe(|| once.call_once(|| panic!("initialization failed"))));
    let mut saw_poison = false;
    once.call_once_force(|state| { saw_poison = state.is_poisoned(); });
    assert!(saw_poison);
    once.call_once(|| unreachable!());
}
