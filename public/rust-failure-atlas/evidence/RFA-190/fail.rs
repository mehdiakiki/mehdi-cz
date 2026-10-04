use std::cell::Cell;

fn main() {
    let calls = Cell::new(0);
    let mut values = [9_i32, -1, 7, -3, 5, -8];

    values.sort_by_key(|value| {
        calls.set(calls.get() + 1);
        value.abs()
    });

    assert_eq!(values, [-1, -3, 5, 7, -8, 9]);
    assert_eq!(
        calls.get(),
        values.len(),
        "sort_by_key may evaluate the key function more than once per element"
    );
}
