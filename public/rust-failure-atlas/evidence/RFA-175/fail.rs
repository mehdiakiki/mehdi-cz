use std::sync::Arc;

fn main() {
    let value = Arc::new(String::from("payload"));
    let observer = Arc::downgrade(&value);
    let owned = Arc::try_unwrap(value).unwrap();

    assert_eq!(owned, "payload");
    assert!(
        observer.upgrade().is_some(),
        "Arc::try_unwrap ignores Weak pointers and removes the final strong owner"
    );
}
