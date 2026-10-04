use std::sync::Arc;

fn main() {
    let mut value = Arc::new(String::from("ready"));
    let _observer = Arc::downgrade(&value);

    assert!(
        Arc::get_mut(&mut value).is_some(),
        "a remaining Weak pointer prevents get_mut"
    );
}
