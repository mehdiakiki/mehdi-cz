use std::sync::Arc;

fn main() {
    let strong = Arc::new(String::from("worker"));
    let weak = Arc::downgrade(&strong);
    drop(strong);
    assert!(weak.upgrade().is_some(), "Weak::upgrade returns None after the last strong Arc is dropped");
}
