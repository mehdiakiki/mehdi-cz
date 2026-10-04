use std::sync::{Arc, Barrier};

fn main() {
    let barrier = Arc::new(Barrier::new(4));
    let handles: Vec<_> = (0..4).map(|_| {
        let barrier = Arc::clone(&barrier);
        std::thread::spawn(move || barrier.wait().is_leader())
    }).collect();
    let leaders = handles.into_iter().map(|h| h.join().unwrap()).filter(|leader| *leader).count();
    assert_eq!(leaders, 1);
}
