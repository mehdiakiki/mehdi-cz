use std::sync::Arc;

fn main() {
    let value = Arc::new(String::from("payload"));
    let observer = Arc::downgrade(&value);
    let owned_copy = String::clone(&value);

    assert_eq!(owned_copy, "payload");
    assert_eq!(&*observer.upgrade().unwrap(), "payload");
}
