use std::time::{Duration, Instant};

fn main() {
    let earlier = Instant::now();
    let later = earlier.checked_add(Duration::from_secs(1)).unwrap();
    let reversed = earlier.duration_since(later);

    assert_ne!(
        reversed,
        Duration::ZERO,
        "Instant::duration_since currently saturates to zero when its arguments are reversed"
    );
}
