fn main() {
    assert_eq!(300.0_f64 as u8, u8::MAX);
    assert_eq!((-100.0_f64) as u8, u8::MIN);
    assert_eq!(f64::NAN as u8, 0);
    assert_eq!(42.9_f64 as u8, 42);
}
