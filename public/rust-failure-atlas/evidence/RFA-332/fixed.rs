use std::sync::OnceLock;

fn main() {
    let value = OnceLock::new();

    assert!(
        std::panic::catch_unwind(|| value.get_or_init(|| panic!("first initializer failed")))
            .is_err()
    );
    assert_eq!(*value.get_or_init(|| 42), 42);
    assert_eq!(value.get(), Some(&42));
}
