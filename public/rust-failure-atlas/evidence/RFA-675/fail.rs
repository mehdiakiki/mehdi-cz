fn main() {
    let text = "éclair";
    let prefix = text.get(0..1).expect(
        "str::get returns None when a range endpoint is not a UTF-8 character boundary");
    assert_eq!(prefix, "é");
}
