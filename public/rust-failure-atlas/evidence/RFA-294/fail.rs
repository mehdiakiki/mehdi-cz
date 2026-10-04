use std::cell::RefCell;
use std::panic::{catch_unwind, AssertUnwindSafe};

fn main() {
    let value = RefCell::new(String::from("same allocation"));
    let result = catch_unwind(AssertUnwindSafe(|| value.swap(&value)));

    assert!(
        result.is_ok(),
        "RefCell::swap panics when self and other are the same RefCell"
    );
}
