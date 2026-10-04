fn main() {
    let mut text = String::from("aéb");
    let start = text.find('é').unwrap();
    let end = start + 'é'.len_utf8();

    assert!(text.is_char_boundary(start));
    assert!(text.is_char_boundary(end));
    text.replace_range(start..end, "X");
    assert_eq!(text, "aXb");
}
