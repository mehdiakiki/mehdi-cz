fn main() {
    let one_plus_epsilon = 1.0_f64 + f64::EPSILON;
    let one_minus_epsilon = 1.0_f64 - f64::EPSILON;
    let fused = one_plus_epsilon.mul_add(one_minus_epsilon, -1.0);
    let separate = one_plus_epsilon * one_minus_epsilon - 1.0;

    assert_eq!(fused, -(f64::EPSILON * f64::EPSILON));
    assert_eq!(separate, 0.0);
    assert_ne!(fused, separate);
}
