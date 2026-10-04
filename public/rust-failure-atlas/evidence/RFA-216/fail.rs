fn main() {
    let value = "\u{3000}token\u{3000}";

    assert_eq!(
        value.trim(),
        value,
        "str::trim removes Unicode whitespace, not only ASCII spaces"
    );
}
