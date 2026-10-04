use std::panic::{catch_unwind, AssertUnwindSafe};

fn main() {
    let mut destination = [0_u8; 3];
    let outcome = catch_unwind(AssertUnwindSafe(|| {
        destination.copy_from_slice(&[7, 8]);
    }));
    assert!(
        outcome.is_ok(),
        "slice::copy_from_slice requires source and destination lengths to match"
    );
}
