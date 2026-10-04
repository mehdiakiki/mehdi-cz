use std::sync::atomic::{AtomicUsize, Ordering};

fn main() {
    let state = AtomicUsize::new(7);
    let _ = state.load(Ordering::Release);
}
