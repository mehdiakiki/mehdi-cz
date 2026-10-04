use std::sync::Arc;

fn main() {
    let mut value = Arc::new(String::from("ready"));
    let observer = Arc::downgrade(&value);
    drop(observer);

    Arc::get_mut(&mut value).unwrap().push_str(" now");
    assert_eq!(&*value, "ready now");
}
