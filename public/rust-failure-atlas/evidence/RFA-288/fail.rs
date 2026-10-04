use std::time::Duration;

fn main() {
    Duration::from_secs(8)
        .checked_div(0)
        .expect("Duration::checked_div returns None when the divisor is zero");
}
