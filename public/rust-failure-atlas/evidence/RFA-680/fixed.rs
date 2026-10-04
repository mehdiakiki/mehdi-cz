use std::sync::OnceLock;

fn main() {
    let cell = OnceLock::new();
    assert_eq!(cell.set("primary"), Ok(()));
    assert_eq!(cell.set("replacement"), Err("replacement"));
    assert_eq!(cell.get(), Some(&"primary"));
}
