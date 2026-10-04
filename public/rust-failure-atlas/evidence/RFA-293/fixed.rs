use std::panic;
use std::sync::atomic::{AtomicUsize, Ordering};

static HOOK_CALLS: AtomicUsize = AtomicUsize::new(0);

fn main() {
    let previous = panic::take_hook();
    panic::set_hook(Box::new(|_| {
        HOOK_CALLS.fetch_add(1, Ordering::SeqCst);
    }));

    let result = panic::catch_unwind(|| panic!("caught payload"));
    panic::set_hook(previous);

    assert!(result.is_err());
    assert_eq!(HOOK_CALLS.load(Ordering::SeqCst), 1);
}
