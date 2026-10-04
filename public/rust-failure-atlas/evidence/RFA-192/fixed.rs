fn main() {
    let mut text = String::from("abcdef");
    {
        let mut removed = text.drain(1..2);
        assert_eq!(removed.next(), Some('b'));
    }

    assert_eq!(text, "acdef");
}
