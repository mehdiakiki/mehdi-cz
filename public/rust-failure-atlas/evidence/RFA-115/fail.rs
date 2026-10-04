use std::sync::Arc;

fn main() {
    let configuration = Arc::new(String::from("ready"));
    let observer = Arc::clone(&configuration);

    let owned = Arc::try_unwrap(configuration)
        .unwrap_or_else(|_| panic!("Arc::try_unwrap failed while a strong clone remains"));
    drop(observer);
    assert_eq!(owned, "ready");
}
