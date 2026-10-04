use std::cell::Cell;

fn main() {
    let calls = Cell::new(0);
    let skipped = false.then(|| {
        calls.set(calls.get() + 1);
        42
    });
    assert_eq!(skipped, None);
    assert_eq!(calls.get(), 0);

    let built = true.then(|| {
        calls.set(calls.get() + 1);
        42
    });
    assert_eq!(built, Some(42));
    assert_eq!(calls.get(), 1);
}
