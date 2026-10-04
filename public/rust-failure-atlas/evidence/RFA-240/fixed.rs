fn main() {
    let text = "éclair";
    assert_eq!(text.get(1..), None);

    let after_first_scalar = text.char_indices().nth(1).map_or(text.len(), |(at, _)| at);
    assert_eq!(text.get(after_first_scalar..), Some("clair"));
}
