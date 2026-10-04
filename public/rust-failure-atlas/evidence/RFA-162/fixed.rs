use std::sync::Arc;

fn main() {
    let mut current = Arc::new(String::from("before"));
    let retained_snapshot = Arc::clone(&current);
    let observer = Arc::downgrade(&retained_snapshot);

    Arc::make_mut(&mut current).push_str("-after");

    assert_eq!(&*current, "before-after");
    assert_eq!(&*observer.upgrade().unwrap(), "before");
}
