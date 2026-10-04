use std::sync::Mutex;

fn update(values: &Mutex<Vec<u8>>) -> Result<(), &'static str> {
    let mut guard = values.lock().unwrap();
    guard.push(1);
    Err("remote write failed")
}

fn main() {
    let values = Mutex::new(Vec::new());
    assert!(update(&values).is_err());

    assert!(
        values.is_poisoned(),
        "returning Err while a guard is held does not poison a Mutex"
    );
}
