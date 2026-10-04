use std::sync::OnceLock;

fn main() {
    let cell = OnceLock::new();
    assert_eq!(cell.set(String::from("first")), Ok(()));
    let rejected = cell.set(String::from("second")).unwrap_err();
    assert_eq!(rejected, "second");
    assert_eq!(cell.get().map(String::as_str), Some("first"));
}
