fn main() {
    let mut text = String::from("aéb");
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        text.replace_range(2..3, "X");
    }));

    assert!(
        result.is_ok(),
        "String::replace_range panics when an endpoint is not a UTF-8 character boundary"
    );
}
