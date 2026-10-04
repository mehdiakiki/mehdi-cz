fn main() {
    assert_eq!('é'.escape_debug().to_string(), "é");
    assert_eq!('é'.escape_default().to_string(), "\\u{e9}");
    assert_eq!('é'.escape_unicode().to_string(), "\\u{e9}");
    assert_eq!('\n'.escape_debug().to_string(), "\\n");
}
