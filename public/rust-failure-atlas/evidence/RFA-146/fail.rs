use std::mem;

fn main() {
    let mut values = vec![0, 1, 2, 3];
    let drained = values.drain(1..3);
    mem::forget(drained);

    assert_eq!(
        values,
        vec![0, 3],
        "forgetting Drain skips the destructor that restores the vector tail"
    );
}
