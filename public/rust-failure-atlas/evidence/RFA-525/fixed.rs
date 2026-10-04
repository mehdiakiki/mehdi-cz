fn borrow<'a>(value: &'a str) -> &'a str {
    value
}

fn main() {
    let owned = String::from("ready");
    assert_eq!(borrow(&owned), "ready");
}
