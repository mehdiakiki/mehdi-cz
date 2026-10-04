fn main() {
    assert_eq!("aaaa".strip_prefix("aa"), Some(""), "str::strip_prefix removes only one matching prefix occurrence");
}
