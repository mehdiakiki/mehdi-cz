use std::sync::atomic::{AtomicUsize, Ordering};

fn main() {
    let state = AtomicUsize::new(5);
    let observed = state.compare_exchange(4, 7, Ordering::SeqCst, Ordering::SeqCst);
    assert_eq!(observed, Err(5));
    assert_eq!(state.compare_exchange(5, 7, Ordering::SeqCst, Ordering::SeqCst), Ok(5));
}
