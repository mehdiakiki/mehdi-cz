use std::time::{Duration, Instant};

fn main() {
    let earlier = Instant::now();
    let later = earlier + Duration::from_secs(1);
    let elapsed = earlier.duration_since(later);
    assert_eq!(elapsed, Duration::from_secs(1),
        "Instant::duration_since saturates to zero when the earlier and later operands are reversed");
}
