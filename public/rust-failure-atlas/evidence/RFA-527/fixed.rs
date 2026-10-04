fn stop_after_first(values: &[u8]) -> Option<u8> {
    for &value in values {
        return Some(value);
    }
    None
}

fn main() {
    assert_eq!(stop_after_first(&[4, 5]), Some(4));
}
