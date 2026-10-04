use std::{sync::Arc, sync::Once, thread};

fn main() {
    let once = Arc::new(Once::new());
    let worker_once = Arc::clone(&once);

    assert!(
        thread::spawn(move || worker_once.call_once(|| panic!("initializer failed")))
            .join()
            .is_err()
    );
    assert!(!once.is_completed());

    once.call_once_force(|state| assert!(state.is_poisoned()));
    assert!(once.is_completed());
}
