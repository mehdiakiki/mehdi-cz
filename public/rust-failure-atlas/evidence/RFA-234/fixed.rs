use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc, Barrier,
};
use std::thread;

fn main() {
    let barrier = Arc::new(Barrier::new(3));
    let leaders = Arc::new(AtomicUsize::new(0));
    let handles: Vec<_> = (0..3)
        .map(|_| {
            let barrier = Arc::clone(&barrier);
            let leaders = Arc::clone(&leaders);
            thread::spawn(move || {
                if barrier.wait().is_leader() {
                    leaders.fetch_add(1, Ordering::SeqCst);
                }
            })
        })
        .collect();

    for handle in handles {
        handle.join().unwrap();
    }
    assert_eq!(leaders.load(Ordering::SeqCst), 1);
}
