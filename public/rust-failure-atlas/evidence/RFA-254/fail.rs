use std::sync::atomic::{AtomicUsize, Ordering};

static SECOND_CALLS: AtomicUsize = AtomicUsize::new(0);

fn second() -> Result<u8, &'static str> {
    SECOND_CALLS.fetch_add(1, Ordering::SeqCst);
    Ok(2)
}

fn main() {
    let first: Result<u8, &str> = Err("first failed");
    assert_eq!(first.and(second()), Err("first failed"));
    assert_eq!(SECOND_CALLS.load(Ordering::SeqCst), 0, "Result::and evaluates its second argument eagerly");
}
