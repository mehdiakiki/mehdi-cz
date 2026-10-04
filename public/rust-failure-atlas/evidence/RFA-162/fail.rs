use std::sync::Arc;

fn main() {
    let mut current = Arc::new(String::from("before"));
    let observer = Arc::downgrade(&current);

    Arc::make_mut(&mut current).push_str("-after");

    assert!(
        observer.upgrade().is_some(),
        "Arc::make_mut dissociates Weak pointers when no other strong owner exists"
    );
}
