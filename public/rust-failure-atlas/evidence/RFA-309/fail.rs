fn main() {
    assert_eq!(
        "rust".split_once(""),
        None,
        "an empty string pattern matches the first UTF-8 boundary in split_once"
    );
}
