fn main() {
    let mut values = [0.0_f64, -0.0_f64];
    values.sort_by(f64::total_cmp);
    let bits = values.map(f64::to_bits);

    assert_eq!(
        bits,
        [0.0_f64.to_bits(), (-0.0_f64).to_bits()],
        "f64::total_cmp orders negative zero before positive zero"
    );
}
