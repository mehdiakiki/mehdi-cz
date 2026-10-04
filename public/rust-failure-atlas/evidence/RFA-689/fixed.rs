use std::panic::{AssertUnwindSafe, catch_unwind};
use std::sync::OnceLock;

fn main() {
    let cell = OnceLock::<u8>::new();
    let _ = catch_unwind(AssertUnwindSafe(|| cell.get_or_init(|| panic!("not ready"))));
    assert_eq!(cell.get(), None);
    assert_eq!(cell.get_or_init(|| 7), &7);
}
