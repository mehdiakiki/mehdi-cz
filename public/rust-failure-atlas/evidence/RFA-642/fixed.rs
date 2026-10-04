fn identity<'a>(value: &'a str) -> &'a str {
    value
}

fn main() {
    let function: for<'a> fn(&'a str) -> &'a str = identity;
    assert_eq!(function("ready"), "ready");
}
