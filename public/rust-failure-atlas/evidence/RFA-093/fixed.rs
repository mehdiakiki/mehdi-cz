use std::sync::{Arc, Mutex};

fn main() {
    let value = Arc::new(Mutex::new(1));
    let worker_value = Arc::clone(&value);
    let worker = std::thread::spawn(move || *worker_value.lock().unwrap() += 1);
    worker.join().unwrap();
    assert_eq!(*value.lock().unwrap(), 2);
}
