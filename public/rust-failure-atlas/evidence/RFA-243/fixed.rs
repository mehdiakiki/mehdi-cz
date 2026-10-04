fn safe_saturating_div(value: u32, divisor: u32) -> Option<u32> {
    (divisor != 0).then(|| value.saturating_div(divisor))
}

fn main() {
    assert_eq!(safe_saturating_div(10, 0), None);
    assert_eq!(safe_saturating_div(10, 3), Some(3));
}
