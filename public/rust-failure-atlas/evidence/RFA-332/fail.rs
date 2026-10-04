use std::sync::LazyLock;

fn main() {
    let lazy: LazyLock<u32, _> = LazyLock::new(|| panic!("first initializer failed"));

    assert!(std::panic::catch_unwind(|| LazyLock::force(&lazy)).is_err());
    let second = std::panic::catch_unwind(|| LazyLock::force(&lazy));

    assert!(
        second.is_ok(),
        "LazyLock poisoning is unrecoverable and every later force panics"
    );
}
