use std::sync::Arc;

fn main() {
    let mut left = Arc::new(vec![1]);
    let right = Arc::clone(&left);
    Arc::make_mut(&mut left).push(2);
    assert!(Arc::ptr_eq(&left, &right), "Arc::make_mut clones the inner value when another strong owner exists");
}
