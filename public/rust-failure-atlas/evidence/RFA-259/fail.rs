fn main() {
    assert_eq!(2.5_f64.round(), 2.0, "f64::round breaks halfway ties away from zero, not to even");
}
