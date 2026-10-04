use std::panic::{catch_unwind, AssertUnwindSafe};
use std::sync::RwLock;

fn main() {
    let state = RwLock::new(vec![1_u8]);

    let _ = catch_unwind(AssertUnwindSafe(|| {
        let _reader = state.read().unwrap();
        panic!("reader stopped");
    }));

    assert!(
        state.is_poisoned(),
        "a panic while holding only an RwLock read guard does not poison the lock"
    );
}
