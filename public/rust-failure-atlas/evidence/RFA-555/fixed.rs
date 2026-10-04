use std::sync::atomic::{AtomicUsize, Ordering};

static REQUESTS: AtomicUsize = AtomicUsize::new(0);
static REQUESTS_REF: &AtomicUsize = &REQUESTS;

fn main() {
    REQUESTS_REF.fetch_add(1, Ordering::Relaxed);
    assert_eq!(REQUESTS.load(Ordering::Relaxed), 1);
}
