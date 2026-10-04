use std::sync::{OnceLock, atomic::{AtomicUsize, Ordering}};

fn main() {
    let cell = OnceLock::new();
    let calls = AtomicUsize::new(0);
    assert_eq!(cell.get_or_init(|| { calls.fetch_add(1, Ordering::SeqCst); 7 }), &7);
    assert_eq!(cell.get_or_init(|| { calls.fetch_add(1, Ordering::SeqCst); 9 }), &7);
    assert_eq!(calls.load(Ordering::SeqCst), 1);
}
