use std::sync::{Arc, Mutex};

fn main() {
    let values = Arc::new(Mutex::new(vec![1, 2]));
    values.lock().unwrap().push(3);
    assert_eq!(*values.lock().unwrap(), vec![1, 2, 3]);
}
