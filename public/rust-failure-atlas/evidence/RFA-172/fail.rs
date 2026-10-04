fn main() {
    let text = "éclair";
    let index = text.find('c').unwrap();

    assert_eq!(
        index,
        1,
        "str::find returns a UTF-8 byte offset rather than a character count"
    );
}
