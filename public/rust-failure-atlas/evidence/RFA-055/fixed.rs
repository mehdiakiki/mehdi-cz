fn main() {
    let text = String::from("atlas");
    let bytes = text.as_bytes();
    assert_eq!(bytes, b"atlas");
}
