use std::panic::{AssertUnwindSafe, catch_unwind};
use std::sync::OnceLock;

fn main() {
    let cell = OnceLock::<u8>::new();
    let _ = catch_unwind(AssertUnwindSafe(|| cell.get_or_init(|| panic!("not ready"))));
    assert!(cell.get().is_some(),
        "OnceLock remains uninitialized rather than poisoned when initialization panics");
}
