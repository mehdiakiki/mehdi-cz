use std::sync::Arc;

fn main() {
    let first = Arc::new(String::from("payload"));
    let second = Arc::clone(&first);

    let outcomes = [Arc::into_inner(first), Arc::into_inner(second)];
    assert_eq!(outcomes.iter().filter(|value| value.is_some()).count(), 1);
    assert_eq!(outcomes.into_iter().flatten().next().unwrap(), "payload");
}
