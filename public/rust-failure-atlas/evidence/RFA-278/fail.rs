fn main() {
    let mut text = String::from("aé");
    let before = text.len();
    let removed = text.pop();

    assert_eq!(removed, Some('é'));
    assert_eq!(text.len(), before - 1, "String::pop removes one Unicode scalar, which can occupy more than one UTF-8 byte");
}
