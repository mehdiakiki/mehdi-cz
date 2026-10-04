fn propagating_min(left: f64, right: f64) -> f64 {
    if left.is_nan() || right.is_nan() {
        f64::NAN
    } else {
        left.min(right)
    }
}

fn main() {
    assert!(propagating_min(5.0, f64::NAN).is_nan());
    assert!(propagating_min(f64::NAN, 5.0).is_nan());
    assert_eq!(propagating_min(5.0, 3.0), 3.0);
}
