use std::panic::catch_unwind;
use std::sync::atomic::{AtomicBool, Ordering};

static CLEANED: AtomicBool = AtomicBool::new(false);

struct InfallibleCleanup;

impl Drop for InfallibleCleanup {
    fn drop(&mut self) {
        CLEANED.store(true, Ordering::SeqCst);
    }
}

fn main() {
    let result = catch_unwind(|| {
        let _guard = InfallibleCleanup;
        panic!("original panic");
    });

    assert!(result.is_err());
    assert!(CLEANED.load(Ordering::SeqCst));
}
