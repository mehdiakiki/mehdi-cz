use std::sync::Arc;

fn main() {
    let configuration = Arc::new(String::from("ready"));
    let observer = Arc::clone(&configuration);
    assert_eq!(observer.as_str(), "ready");
    drop(observer);

    let owned = Arc::try_unwrap(configuration).expect("the final strong owner can unwrap");
    assert_eq!(owned, "ready");
}
