use std::{sync::Arc, sync::Once, thread};

fn main() {
    let once = Arc::new(Once::new());
    let worker_once = Arc::clone(&once);

    let result = thread::spawn(move || {
        worker_once.call_once(|| panic!("initializer failed"));
    })
    .join();

    assert!(result.is_err());
    assert!(
        once.is_completed(),
        "Once::is_completed remains false after a poisoned initializer"
    );
}
