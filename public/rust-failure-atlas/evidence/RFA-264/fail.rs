use std::panic::catch_unwind;

fn main() {
    let value = std::hint::black_box(i32::MIN);
    let outcome = catch_unwind(|| value.abs());
    assert!(outcome.is_ok(), "i32::abs overflows for MIN when overflow checks are enabled");
}
