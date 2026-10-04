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
    calls.store(0, Ordering::SeqCst);
    let _ = panic::catch_unwind(AssertUnwindSafe(|| panic::resume_unwind(payload)));
    let resume_hook_calls = calls.load(Ordering::SeqCst);

    panic::set_hook(previous);
    assert_eq!(
        resume_hook_calls,
        1,
        "panic::resume_unwind resumes the payload without invoking the panic hook again"
    );
}
