fn main() {
    assert_eq!((-0.0_f64).signum(), -1.0);
    assert_eq!(0.0_f64.signum(), 1.0);
    assert!(f64::NAN.signum().is_nan());
}
