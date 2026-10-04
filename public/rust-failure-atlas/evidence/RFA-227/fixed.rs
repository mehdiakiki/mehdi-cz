fn main() {
    let mut exact_values = [0.0_f64, -0.0_f64];
    exact_values.sort_by(f64::total_cmp);
    assert_eq!(
        exact_values.map(f64::to_bits),
        [(-0.0_f64).to_bits(), 0.0_f64.to_bits()]
    );

    let mut domain_values = [0.0_f64, -0.0_f64];
    domain_values.iter_mut().for_each(|value| {
        if *value == 0.0 {
            *value = 0.0;
        }
    });
    domain_values.sort_by(f64::total_cmp);
    assert_eq!(domain_values.map(f64::to_bits), [0, 0]);
}
