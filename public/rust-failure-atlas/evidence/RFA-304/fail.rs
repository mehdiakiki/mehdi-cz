use std::panic;

fn main() {
    let result = panic::catch_unwind(|| (-1_i32).isqrt());

    assert!(
        result.is_ok(),
        "signed integer isqrt panics for negative input; checked_isqrt returns None"
    );
}
