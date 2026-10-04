use std::panic::{catch_unwind, AssertUnwindSafe};

fn main() {
    let mut completed = 0;
    let result = catch_unwind(AssertUnwindSafe(|| {
        completed += 1;
        panic!("operation failed");
    }));

    assert!(result.is_err());
    assert_eq!(completed, 1);
}
