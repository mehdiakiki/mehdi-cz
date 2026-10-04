fn main() {
    let mut text = String::from("éclair");
    let second_scalar = text
        .char_indices()
        .nth(1)
        .map(|(byte, _)| byte)
        .unwrap_or(text.len());

    let suffix = text.split_off(second_scalar);
    assert_eq!(text, "é");
    assert_eq!(suffix, "clair");
}
