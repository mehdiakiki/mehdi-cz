use std::{sync::Arc, sync::Mutex, thread};

fn main() {
    let value = Arc::new(Mutex::new(1));
    let worker_value = Arc::clone(&value);

    assert!(
        thread::spawn(move || {
            let mut guard = worker_value.lock().unwrap();
            *guard = 2;
            panic!("worker failed");
        })
        .join()
        .is_err()
    );

    let mutex = Arc::try_unwrap(value).unwrap();
    assert!(
        mutex.into_inner().is_ok(),
        "Mutex::into_inner reports poison even though it owns and can return the protected value"
    );
}
