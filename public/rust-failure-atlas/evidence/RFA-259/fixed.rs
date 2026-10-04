fn main() {
    assert_eq!(2.5_f64.round(), 3.0);
    assert_eq!((-2.5_f64).round(), -3.0);
    assert_eq!(2.5_f64.round_ties_even(), 2.0);
    assert_eq!(3.5_f64.round_ties_even(), 4.0);
}
