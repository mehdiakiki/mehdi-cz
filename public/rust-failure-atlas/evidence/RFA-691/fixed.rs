use std::sync::Arc;

fn main() {
    let owner = Arc::new(String::from("complete"));
    let observer = Arc::downgrade(&owner);
    let value = Arc::try_unwrap(owner).expect("no other strong owner remains");
    assert_eq!(value, "complete");
    assert!(observer.upgrade().is_none());
}
