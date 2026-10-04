use std::sync::Arc;

fn main() {
    let strong = Arc::new(String::from("worker"));
    let weak = Arc::downgrade(&strong);
    assert_eq!(weak.upgrade().as_deref().map(String::as_str), Some("worker"));
    drop(strong);
    assert!(weak.upgrade().is_none());
}
