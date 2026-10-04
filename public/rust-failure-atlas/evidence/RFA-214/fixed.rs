use std::time::Duration;

fn main() {
    let timeout = Duration::from_micros(1_999);
    assert_eq!(timeout.as_millis(), 1);

    let rounded_up_millis = timeout.as_nanos().div_ceil(1_000_000);
    assert_eq!(rounded_up_millis, 2);
}
