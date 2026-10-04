use std::sync::OnceLock;

fn main() {
    let cell = OnceLock::new();
    assert_eq!(cell.set(String::from("first")), Ok(()));
    assert_eq!(
        cell.set(String::from("second")),
        Ok(()),
        "OnceLock::set returns the rejected owned value when the cell was already initialized"
    );
}
