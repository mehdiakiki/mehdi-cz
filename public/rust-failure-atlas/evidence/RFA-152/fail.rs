#![deny(let_underscore_lock)]

use std::sync::Mutex;

fn main() {
    let state = Mutex::new(0_u32);
    let _ = state.lock().unwrap();
    println!("critical section has already ended");
}
