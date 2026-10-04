use std::time::Duration;

fn canonical_duration(secs: u64, nanos: u32) -> Option<Duration> {
    (nanos < 1_000_000_000).then(|| Duration::new(secs, nanos))
}

fn main() {
    assert!(canonical_duration(1, 1_500_000_000).is_none());
    assert_eq!(
        canonical_duration(1, 500_000_000),
        Some(Duration::from_millis(1500))
    );
}
