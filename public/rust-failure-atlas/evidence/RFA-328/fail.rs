use std::{sync::Arc, sync::RwLock, thread};

fn main() {
    let value = Arc::new(RwLock::new(1));
    let worker_value = Arc::clone(&value);

    assert!(
        thread::spawn(move || {
            let mut guard = worker_value.write().unwrap();
            *guard = 2;
            panic!("writer failed");
        })
        .join()
        .is_err()
    );

    let read_result = value.read();
    assert!(
        read_result.is_ok(),
        "a panic while holding an RwLock write guard poisons the lock"
    );
}
