fn main() {
    let value = "\u{3000}token\u{3000}";

    assert_eq!(value.trim(), "token");
    assert_eq!(value.trim_ascii(), value);
}
