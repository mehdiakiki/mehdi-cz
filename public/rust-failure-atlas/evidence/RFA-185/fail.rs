use std::time::Duration;

fn main() {
    let value = Duration::new(1, 1_500_000_000);

    assert_eq!(
        value.as_secs(),
        1,
        "Duration::new carries excess nanoseconds into whole seconds"
    );
}
