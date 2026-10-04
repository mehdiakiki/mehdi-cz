use std::sync::OnceLock;

fn main() {
    let endpoint = OnceLock::new();
    endpoint.set("primary").unwrap();
    endpoint.set("replacement").unwrap();
}
