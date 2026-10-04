use std::{
    panic::{self, AssertUnwindSafe},
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    },
};

fn main() {
    let calls = Arc::new(AtomicUsize::new(0));
    let observed = Arc::clone(&calls);
    let previous = panic::take_hook();
    panic::set_hook(Box::new(move |_| {
        observed.fetch_add(1, Ordering::SeqCst);
    }));

    let payload = panic::catch_unwind(|| panic!("original panic")).unwrap_err();
    assert_eq!(calls.load(Ordering::SeqCst), 1);

    calls.store(0, Ordering::SeqCst);
    let resumed = panic::catch_unwind(AssertUnwindSafe(|| panic::resume_unwind(payload)));
    let resume_hook_calls = calls.load(Ordering::SeqCst);

    panic::set_hook(previous);
    assert!(resumed.is_err());
    assert_eq!(resume_hook_calls, 0);
}
