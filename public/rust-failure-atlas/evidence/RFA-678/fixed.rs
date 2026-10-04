use std::time::Duration;

fn main() {
    let remaining = Duration::from_secs(2).checked_sub(Duration::from_secs(5));
    assert_eq!(remaining, None);
}
