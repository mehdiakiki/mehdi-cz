fn main() {
    assert_eq!(
        'é'.escape_debug().to_string(),
        "\\u{e9}",
        "char::escape_debug keeps printable Unicode readable instead of forcing a Unicode escape"
    );
}
