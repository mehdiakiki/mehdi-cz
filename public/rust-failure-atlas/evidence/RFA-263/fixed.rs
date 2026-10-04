fn strip_repeated<'a>(mut text: &'a str, prefix: &str) -> &'a str {
    while let Some(remainder) = text.strip_prefix(prefix) {
        text = remainder;
    }
    text
}

fn main() {
    assert_eq!("aaaa".strip_prefix("aa"), Some("aa"));
    assert_eq!(strip_repeated("aaaa", "aa"), "");
}
