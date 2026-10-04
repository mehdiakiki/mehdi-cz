fn main() {
    let text = "left\u{000b}right";

    assert_eq!(text.split_ascii_whitespace().collect::<Vec<_>>(), [text]);
    assert_eq!(text.split_whitespace().collect::<Vec<_>>(), ["left", "right"]);
}
