use std::sync::atomic::{AtomicUsize, Ordering};

static DROPS: AtomicUsize = AtomicUsize::new(0);

struct Tracked;

impl Drop for Tracked {
    fn drop(&mut self) {
        DROPS.fetch_add(1, Ordering::SeqCst);
    }
}

fn main() {
    let leaked: &'static mut Tracked = Box::leak(Box::new(Tracked));
    let _ = leaked;
    assert_eq!(DROPS.load(Ordering::SeqCst), 1, "Box::leak prevents the value and allocation from being dropped");
}
