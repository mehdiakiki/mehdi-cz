fn main() {
    let text = "éclair";
    assert!(
        text.get(1..).is_some(),
        "str::get returns None when a byte range cuts through a UTF-8 character"
    );
}
