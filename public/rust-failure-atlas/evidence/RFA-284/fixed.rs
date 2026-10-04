use std::borrow::Cow;

fn main() {
    let source = String::from("quiet");
    let mut value: Cow<'_, str> = Cow::Borrowed(&source);
    value.to_mut().make_ascii_uppercase();

    assert_eq!(source, "quiet");
    assert_eq!(value, "QUIET");
    assert!(matches!(value, Cow::Owned(_)));
}
