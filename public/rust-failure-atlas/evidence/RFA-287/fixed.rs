fn main() {
    let value = -3.6_f64;
    let signed_fraction = value.fract();
    assert!((signed_fraction - (-0.6)).abs() < 1e-12);

    let nonnegative_cycle_offset = value.rem_euclid(1.0);
    assert!((nonnegative_cycle_offset - 0.4).abs() < 1e-12);
}
