fn checked_clamp(value: f64, min: f64, max: f64) -> Option<f64> {
    if min.is_nan() || max.is_nan() || min > max {
        return None;
    }
    Some(value.clamp(min, max))
}

fn main() {
    assert_eq!(checked_clamp(0.5, f64::NAN, 1.0), None);
    assert_eq!(checked_clamp(2.0, 0.0, 1.0), Some(1.0));
    assert!(checked_clamp(f64::NAN, 0.0, 1.0).unwrap().is_nan());
}
