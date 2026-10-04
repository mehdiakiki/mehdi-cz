fn main() {
    assert_eq!((-7_i32).midpoint(0), -3);
    assert_eq!(0_i32.midpoint(-7), -3);
    assert_eq!(i32::MIN.midpoint(i32::MAX), 0);
}
