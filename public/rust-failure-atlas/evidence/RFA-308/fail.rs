fn main() {
    assert_eq!(
        (-0.0_f64).signum(),
        1.0,
        "f64::signum distinguishes negative zero and returns -1.0 for it"
    );
}
