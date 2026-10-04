use std::sync::{
    atomic::{AtomicU8, Ordering},
    Arc, RwLock,
};

fn main() {
    let state = Arc::new(RwLock::new(AtomicU8::new(7)));
    let worker_state = Arc::clone(&state);
    let _ = std::thread::spawn(move || {
        let guard = worker_state.read().unwrap();
        guard.store(9, Ordering::Relaxed);
        panic!("reader failed after interior mutation");
    }).join();
    assert!(state.is_poisoned(),
        "reader-side interior mutation can survive a panic without poisoning the outer RwLock");
}
