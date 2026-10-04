fn main() {
    let one_plus_epsilon = 1.0_f64 + f64::EPSILON;
    let one_minus_epsilon = 1.0_f64 - f64::EPSILON;
    let fused = one_plus_epsilon.mul_add(one_minus_epsilon, -1.0);
    let separate = one_plus_epsilon * one_minus_epsilon - 1.0;

    assert_eq!(
        fused, separate,
        "f64::mul_add rounds once and can differ from multiplication followed by addition"
    );
}
