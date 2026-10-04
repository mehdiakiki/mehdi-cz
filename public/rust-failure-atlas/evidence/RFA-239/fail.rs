use std::borrow::Cow;

fn main() {
    let decoded = String::from_utf8_lossy(b"already valid UTF-8");
    assert!(
        matches!(decoded, Cow::Owned(_)),
        "String::from_utf8_lossy borrows when every input byte is valid UTF-8"
    );
}
