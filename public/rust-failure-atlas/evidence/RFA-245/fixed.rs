use std::sync::atomic::{AtomicUsize, Ordering};

static FALLBACK_CALLS: AtomicUsize = AtomicUsize::new(0);

fn fallback(_: &str) -> usize {
    FALLBACK_CALLS.fetch_add(1, Ordering::SeqCst);
    99
}

fn main() {
    let value: Result<usize, &str> = Ok(7);
    assert_eq!(value.map_or_else(fallback, |number| number), 7);
    assert_eq!(FALLBACK_CALLS.load(Ordering::SeqCst), 0);
}
