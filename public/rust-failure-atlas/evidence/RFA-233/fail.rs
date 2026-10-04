use std::time::Duration;

fn main() {
    let result = std::panic::catch_unwind(|| Duration::from_secs_f64(-0.5));
    assert!(
        result.is_ok(),
        "Duration::from_secs_f64 panics for negative or non-finite input"
    );
}
