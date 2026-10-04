use std::sync::{Arc, Mutex};

fn main() {
    let state = Arc::new(Mutex::new(0_u8));
    let worker_state = Arc::clone(&state);
    let _ = std::thread::spawn(move || {
        let mut guard = worker_state.lock().unwrap();
        *guard = 1;
        panic!("worker failed while holding the mutex");
    }).join();
    let value = match state.lock() {
        Ok(guard) => *guard,
        Err(poisoned) => *poisoned.into_inner(),
    };
    assert_eq!(value, 1);
}
