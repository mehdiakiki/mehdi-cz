use std::panic::catch_unwind;

fn main() {
    let outcome = catch_unwind(|| 10_u32.saturating_div(0));
    assert!(
        outcome.is_ok(),
        "saturating_div still panics when the divisor is zero"
    );
}
