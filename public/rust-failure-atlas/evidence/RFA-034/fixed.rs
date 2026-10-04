use std::sync::Mutex;

fn update(values: &Mutex<Vec<u8>>) -> Result<(), &'static str> {
    let mut guard = values.lock().unwrap();
    guard.push(1);
    Err("remote write failed")
}

fn main() {
    let values = Mutex::new(Vec::new());
    assert!(update(&values).is_err());

    // Poisoning observes unwinding through the guard, not application-level Err.
    assert!(!values.is_poisoned());
    assert_eq!(&*values.lock().unwrap(), &[1]);
}
