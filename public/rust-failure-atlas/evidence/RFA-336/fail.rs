fn main() {
    let fields: Vec<_> = "left\u{000b}right".split_ascii_whitespace().collect();

    assert_eq!(
        fields,
        ["left", "right"],
        "split_ascii_whitespace does not treat ASCII vertical tab as whitespace, unlike split_whitespace"
    );
}
