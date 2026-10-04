use std::sync::Arc;

fn main() {
    let first = Arc::new(String::from("payload"));
    let second = Arc::clone(&first);

    assert!(Arc::into_inner(first).is_none());
    assert!(
        Arc::into_inner(second).is_none(),
        "calling Arc::into_inner on every clone guarantees one successful extraction"
    );
}
