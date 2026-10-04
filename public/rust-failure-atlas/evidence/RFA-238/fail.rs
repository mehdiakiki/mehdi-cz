fn main() {
    let mut text = String::with_capacity(2);
    text.push_str("éé");

    assert!(
        text.capacity() <= 2,
        "String::with_capacity reserves bytes, not Unicode characters"
    );
}
