use std::mem;
use std::sync::Mutex;

fn main() {
    let state = Mutex::new(7);
    let guard = state.lock().unwrap();
    mem::forget(guard);

    assert!(state.try_lock().is_ok(), "forgotten guard keeps the mutex locked");
}
