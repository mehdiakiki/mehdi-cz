use std::thread;

fn main() {
    let successful = thread::spawn(|| 42);
    while !successful.is_finished() {
        thread::yield_now();
    }
    assert_eq!(successful.join().unwrap(), 42);

    let failed = thread::spawn(|| panic!("expected worker failure"));
    while !failed.is_finished() {
        thread::yield_now();
    }
    assert!(failed.join().is_err());
}
