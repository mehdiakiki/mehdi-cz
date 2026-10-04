use std::sync::Arc;

fn main() {
    let mut left = Arc::new(vec![1]);
    let right = Arc::clone(&left);
    Arc::make_mut(&mut left).push(2);
    assert!(!Arc::ptr_eq(&left, &right));
    assert_eq!(&*left, &[1, 2]);
    assert_eq!(&*right, &[1]);
}
