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
    drop(receiver);

    assert!(
        processed.load(Ordering::SeqCst),
        "Sender::send returning Ok does not mean the receiver processed the value"
    );
}
