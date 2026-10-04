use std::time::Duration;

fn main() {
    let original = Duration::from_secs(u64::MAX);
    let reconstructed = Duration::new(original.as_secs(), original.subsec_nanos());

    assert_eq!(reconstructed, original);
    assert!(original.as_nanos() > u64::MAX as u128);
}
