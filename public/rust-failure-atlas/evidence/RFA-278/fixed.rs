fn main() {
    let mut text = String::from("aé");
    let before = text.len();
    let removed = text.pop().expect("the string is not empty");

    assert_eq!(removed, 'é');
    assert_eq!(before - text.len(), removed.len_utf8());
    assert_eq!(text, "a");
}
