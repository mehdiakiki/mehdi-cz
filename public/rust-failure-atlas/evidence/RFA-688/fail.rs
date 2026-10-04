use std::panic::{AssertUnwindSafe, catch_unwind};
use std::sync::Once;

fn main() {
    let once = Once::new();
    let _ = catch_unwind(AssertUnwindSafe(|| once.call_once(|| panic!("initialization failed"))));
    let retry = catch_unwind(AssertUnwindSafe(|| once.call_once(|| {})));
    assert!(retry.is_ok(),
        "Once::call_once stays poisoned after its initializer panics and later call_once panics too");
}
