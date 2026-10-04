fn main() {
    let range = 0.0_f64..f64::NAN;
    assert!(!range.is_empty(), "Range::is_empty returns true when either floating-point endpoint is incomparable NaN");
}
