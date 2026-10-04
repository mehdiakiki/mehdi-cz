use std::sync::atomic::{AtomicUsize, Ordering};

fn main() {
    let state = AtomicUsize::new(5);
    let result = state.compare_exchange(4, 7, Ordering::SeqCst, Ordering::SeqCst);
    assert_eq!(result, Err(4),
        "compare_exchange returns the actual current value when the expected value is stale");
}
