use std::time::Duration;

fn main() {
    let original = Duration::from_secs(u64::MAX);
    let reconstructed = Duration::from_nanos(original.as_nanos() as u64);

    assert_eq!(
        reconstructed,
        original,
        "Duration::as_nanos returns u128, so narrowing it to u64 before from_nanos truncates large durations"
    );
}
