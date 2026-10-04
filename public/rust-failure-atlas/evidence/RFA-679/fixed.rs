use std::time::{Duration, Instant};

fn main() {
    let earlier = Instant::now();
    let later = earlier + Duration::from_secs(1);
    assert_eq!(later.duration_since(earlier), Duration::from_secs(1));
    assert_eq!(earlier.checked_duration_since(later), None);
}
