use std::panic::catch_unwind;

fn main() {
    let outcome = catch_unwind(|| (0..4).step_by(0).collect::<Vec<_>>());
    assert!(outcome.is_ok(), "Iterator::step_by panics when step is zero");
}
