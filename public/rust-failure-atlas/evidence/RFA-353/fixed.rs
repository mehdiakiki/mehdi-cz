use std::cmp::Ordering;
use std::sync::atomic::{AtomicUsize, Ordering as AtomicOrdering};

static CALLS: AtomicUsize = AtomicUsize::new(0);

fn compare_secondary() -> Ordering {
    CALLS.fetch_add(1, AtomicOrdering::SeqCst);
    Ordering::Greater
}

fn main() {
    let decided = Ordering::Less.then_with(compare_secondary);
    assert_eq!(decided, Ordering::Less);
    assert_eq!(CALLS.load(AtomicOrdering::SeqCst), 0);

    let tied = Ordering::Equal.then_with(compare_secondary);
    assert_eq!(tied, Ordering::Greater);
    assert_eq!(CALLS.load(AtomicOrdering::SeqCst), 1);
}
