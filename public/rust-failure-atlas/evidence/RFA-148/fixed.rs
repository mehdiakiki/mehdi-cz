use std::panic::{catch_unwind, AssertUnwindSafe};
use std::sync::Mutex;

fn main() {
    let mut state = Mutex::new(Vec::<u8>::new());

    let _ = catch_unwind(AssertUnwindSafe(|| {
        let mut guard = state.lock().unwrap();
        guard.push(1);
        panic!("worker stopped during mutation");
    }));

    if let Err(poisoned) = state.get_mut() {
        poisoned.into_inner().clear();
    }
    state.clear_poison();

    assert!(state.get_mut().is_ok());
    assert!(!state.is_poisoned());
}
