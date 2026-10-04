use std::sync::atomic::{AtomicU64, Ordering};

static REQUESTS: AtomicU64 = AtomicU64::new(0);

fn main() {
    REQUESTS.fetch_add(1, Ordering::Relaxed);
    assert_eq!(REQUESTS.load(Ordering::Relaxed), 1);
}
