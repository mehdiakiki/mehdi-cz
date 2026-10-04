use std::sync::{
    atomic::{AtomicBool, Ordering},
    mpsc,
    Arc,
};

struct Job {
    processed: Arc<AtomicBool>,
}

fn main() {
    let processed = Arc::new(AtomicBool::new(false));
    let (sender, receiver) = mpsc::channel();
    sender.send(Job { processed: Arc::clone(&processed) }).unwrap();

    let job = receiver.recv().unwrap();
    job.processed.store(true, Ordering::SeqCst);
    assert!(processed.load(Ordering::SeqCst));
}
