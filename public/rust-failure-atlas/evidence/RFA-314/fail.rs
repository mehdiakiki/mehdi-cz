use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc,
};

struct CountDrop(Arc<AtomicUsize>);

impl Drop for CountDrop {
    fn drop(&mut self) {
        self.0.fetch_add(1, Ordering::SeqCst);
    }
}

fn main() {
    let drops = Arc::new(AtomicUsize::new(0));
    let mut values = vec![CountDrop(Arc::clone(&drops)), CountDrop(Arc::clone(&drops))];

    // SAFETY: reducing length to one is within capacity and adds no uninitialized element.
    unsafe { values.set_len(1) };
    drop(values);

    assert_eq!(
        drops.load(Ordering::SeqCst),
        2,
        "reducing Vec length with set_len does not drop the elements hidden beyond the new length"
    );
}
