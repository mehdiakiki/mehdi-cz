use std::sync::{Arc, Mutex};

fn main() {
    let state = Arc::new(Mutex::new(0_u8));
    let worker_state = Arc::clone(&state);
    let _ = std::thread::spawn(move || {
        let mut guard = worker_state.lock().unwrap();
        *guard = 1;
        panic!("worker failed while holding the mutex");
    }).join();
    drop(state.lock().unwrap());
}
