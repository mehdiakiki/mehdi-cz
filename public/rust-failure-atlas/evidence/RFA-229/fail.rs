use std::time::{Duration, SystemTime};

fn main() {
    let future = SystemTime::now() + Duration::from_secs(3_600);
    assert!(
        future.elapsed().is_ok(),
        "SystemTime::elapsed returns Err when the stored wall-clock time is in the future"
    );
}
