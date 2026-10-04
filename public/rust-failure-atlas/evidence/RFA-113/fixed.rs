use std::sync::OnceLock;

fn main() {
    let endpoint = OnceLock::new();
    endpoint.set("primary").unwrap();
    assert_eq!(endpoint.set("replacement"), Err("replacement"));
    assert_eq!(endpoint.get(), Some(&"primary"));
}
