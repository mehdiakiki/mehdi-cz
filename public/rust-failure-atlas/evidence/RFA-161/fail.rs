use std::sync::atomic::{AtomicUsize, Ordering};

fn main() {
    let state = AtomicUsize::new(1);
    let _ = state.compare_exchange(0, 2, Ordering::AcqRel, Ordering::Release);
}
