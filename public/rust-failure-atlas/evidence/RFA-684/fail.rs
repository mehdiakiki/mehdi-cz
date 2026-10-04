use std::sync::{Arc, RwLock};

fn main() {
    let state = Arc::new(RwLock::new(0_u8));
    let worker_state = Arc::clone(&state);
    let _ = std::thread::spawn(move || {
        let mut guard = worker_state.write().unwrap();
        *guard = 1;
        panic!("writer failed");
    }).join();
    drop(state.read().unwrap());
}
