fn accepts_any_borrow<F>(callback: F)
where
    F: for<'a> Fn(&'a str) -> &'a str,
{
    assert_eq!(callback("atlas"), "atlas");
}

fn identity(value: &str) -> &str {
    value
}

fn main() {
    accepts_any_borrow(identity);
}
