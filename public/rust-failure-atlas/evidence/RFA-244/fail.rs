use std::panic::catch_unwind;

fn main() {
    let outcome = catch_unwind(|| 0.5_f64.clamp(f64::NAN, 1.0));
    assert!(
        outcome.is_ok(),
        "f64::clamp panics when either bound is NaN"
    );
}
