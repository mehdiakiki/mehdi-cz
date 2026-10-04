use std::sync::atomic::{AtomicUsize, Ordering};

static DROPS: AtomicUsize = AtomicUsize::new(0);

struct Tracked;

impl Drop for Tracked {
    fn drop(&mut self) {
        DROPS.fetch_add(1, Ordering::SeqCst);
    }
}

fn main() {
    let owned = Box::new(Tracked);
    drop(owned);
    assert_eq!(DROPS.load(Ordering::SeqCst), 1);
}
