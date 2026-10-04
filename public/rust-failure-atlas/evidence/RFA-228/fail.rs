use std::cell::Cell;

fn main() {
    let calls = Cell::new(0);
    let value = false.then_some({
        calls.set(calls.get() + 1);
        42
    });

    assert_eq!(value, None);
    assert_eq!(
        calls.get(),
        0,
        "bool::then_some evaluates its argument eagerly"
    );
}
