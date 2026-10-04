use std::sync::Arc;

fn main() {
    let owner = Arc::new(String::from("complete"));
    let observer = Arc::downgrade(&owner);
    let result = Arc::try_unwrap(owner);
    assert!(result.is_err(),
        "Arc::try_unwrap can recover T while Weak pointers exist because they do not own T");
    drop(observer);
}
