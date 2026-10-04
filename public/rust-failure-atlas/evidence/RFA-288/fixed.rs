use std::time::Duration;

fn divide_duration(duration: Duration, divisor: u32) -> Result<Duration, &'static str> {
    duration.checked_div(divisor).ok_or("duration divisor must be nonzero")
}

fn main() {
    assert_eq!(divide_duration(Duration::from_secs(8), 0), Err("duration divisor must be nonzero"));
    assert_eq!(divide_duration(Duration::from_secs(8), 2), Ok(Duration::from_secs(4)));
}
