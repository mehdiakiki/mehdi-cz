use std::time::{Duration, Instant, SystemTime};

fn main() {
    let future = SystemTime::now() + Duration::from_secs(3_600);
    let wrong_direction = future.elapsed().unwrap_err();
    assert!(wrong_direction.duration() > Duration::from_secs(3_500));

    let started = Instant::now();
    let elapsed = started.elapsed();
    assert!(elapsed < Duration::from_secs(1));
}
