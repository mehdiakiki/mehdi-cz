use std::cell::RefCell;
use std::sync::Arc;

fn main() {
    let value = Arc::new(RefCell::new(1));
    let worker_value = Arc::clone(&value);
    std::thread::spawn(move || *worker_value.borrow_mut() += 1);
}
