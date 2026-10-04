use std::time::Duration;

fn main() {
    let timeout = Duration::from_micros(1_999);

    assert_eq!(
        timeout.as_millis(),
        2,
        "Duration::as_millis returns whole milliseconds and truncates the fraction"
    );
}
