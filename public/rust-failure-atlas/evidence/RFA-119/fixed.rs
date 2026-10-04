use std::sync::atomic::{AtomicU64, Ordering};

static REQUESTS: AtomicU64 = AtomicU64::new(0);

fn main() {
    assert_eq!(REQUESTS.load(Ordering::Relaxed), 0);
}
