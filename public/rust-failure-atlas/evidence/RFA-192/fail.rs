fn main() {
    let mut text = String::from("abcdef");
    {
        let mut removed = text.drain(1..5);
        assert_eq!(removed.next(), Some('b'));
    }

    assert_eq!(
        text, "acdef",
        "dropping String::Drain removes its entire selected range, not only yielded characters"
    );
}
