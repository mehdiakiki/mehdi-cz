use std::borrow::Cow;

fn main() {
    let valid = String::from_utf8_lossy(b"already valid UTF-8");
    assert!(matches!(valid, Cow::Borrowed(_)));

    let invalid = String::from_utf8_lossy(b"bad: \xff");
    assert!(matches!(invalid, Cow::Owned(_)));
    assert_eq!(invalid, "bad: \u{fffd}");
}
