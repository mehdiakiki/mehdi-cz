use std::time::{Duration, Instant};

fn main() {
    let earlier = Instant::now();
    let later = earlier.checked_add(Duration::from_secs(1)).unwrap();

    assert_eq!(earlier.checked_duration_since(later), None);
    assert_eq!(earlier.saturating_duration_since(later), Duration::ZERO);
    assert_eq!(later.checked_duration_since(earlier), Some(Duration::from_secs(1)));
}
