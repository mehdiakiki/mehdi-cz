use std::sync::{Arc, atomic::{AtomicUsize, Ordering}};

struct Tracked(Arc<AtomicUsize>);
impl Drop for Tracked { fn drop(&mut self) { self.0.fetch_add(1, Ordering::SeqCst); } }

fn main() {
    let drops = Arc::new(AtomicUsize::new(0));
    let mut slot = Tracked(Arc::clone(&drops));
    let old = std::mem::replace(&mut slot, Tracked(Arc::clone(&drops)));
    assert_eq!(drops.load(Ordering::SeqCst), 0);
    drop(old);
    assert_eq!(drops.load(Ordering::SeqCst), 1);
    drop(slot);
    assert_eq!(drops.load(Ordering::SeqCst), 2);
}
