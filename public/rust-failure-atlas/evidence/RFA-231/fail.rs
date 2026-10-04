use std::collections::VecDeque;

fn main() {
    let result = std::panic::catch_unwind(|| {
        let mut values = VecDeque::from([1, 2, 3]);
        values.rotate_left(4);
    });

    assert!(
        result.is_ok(),
        "VecDeque::rotate_left panics when the amount exceeds its length"
    );
}
