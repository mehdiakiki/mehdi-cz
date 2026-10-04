use std::sync::OnceLock;

fn main() {
    let cell = OnceLock::new();
    assert_eq!(cell.set("primary"), Ok(()));
    let second = cell.set("replacement");
    assert!(second.is_ok(),
        "OnceLock::set returns the rejected value when the cell is already initialized");
}
