fn starts_with_marker(values: &[u8]) -> bool {
    matches!(values, [7, ..])
}

fn main() {
    assert!(starts_with_marker(&[7, 8, 9]));
    assert!(!starts_with_marker(&[]));
}
