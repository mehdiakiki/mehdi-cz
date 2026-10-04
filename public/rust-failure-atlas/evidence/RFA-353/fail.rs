use std::cmp::Ordering;
use std::sync::atomic::{AtomicUsize, Ordering as AtomicOrdering};

static CALLS: AtomicUsize = AtomicUsize::new(0);

fn compare_secondary() -> Ordering {
    CALLS.fetch_add(1, AtomicOrdering::SeqCst);
    Ordering::Equal
}

fn main() {
    let result = Ordering::Less.then(compare_secondary());

    assert_eq!(result, Ordering::Less);
    assert_eq!(
        CALLS.load(AtomicOrdering::SeqCst),
        0,
        "Ordering::then receives an already evaluated value, even when self decides the result"
    );
}
