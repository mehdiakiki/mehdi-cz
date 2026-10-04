fn main() {
    let selected = 5.0_f64.min(f64::NAN);

    assert!(
        selected.is_nan(),
        "f64::min ignores one NaN operand and returns the numeric operand"
    );
}
