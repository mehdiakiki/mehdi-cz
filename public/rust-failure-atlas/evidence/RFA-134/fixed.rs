use std::panic::{catch_unwind, AssertUnwindSafe};
use std::sync::Once;

static INITIALIZE: Once = Once::new();

fn main() {
    let _ = catch_unwind(AssertUnwindSafe(|| {
        INITIALIZE.call_once(|| panic!("first initialization failed"));
    }));

    INITIALIZE.call_once_force(|state| {
        assert!(state.is_poisoned());
    });
    INITIALIZE.call_once(|| panic!("Once should now be complete"));
}
