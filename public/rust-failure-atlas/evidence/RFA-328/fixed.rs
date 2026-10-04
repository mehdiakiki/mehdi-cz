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

    let guard = value.read().unwrap_or_else(|error| error.into_inner());
    assert_eq!(*guard, 2);
    drop(guard);
    value.clear_poison();
    assert_eq!(*value.read().unwrap(), 2);
}
