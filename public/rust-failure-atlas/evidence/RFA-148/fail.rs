use std::panic::{catch_unwind, AssertUnwindSafe};
use std::sync::Mutex;

fn main() {
    let mut state = Mutex::new(Vec::<u8>::new());

    let _ = catch_unwind(AssertUnwindSafe(|| {
        let mut guard = state.lock().unwrap();
        guard.push(1);
        panic!("worker stopped during mutation");
    }));

    assert!(
        state.get_mut().is_ok(),
        "exclusive access does not erase a mutex's poison state"
    );
}
