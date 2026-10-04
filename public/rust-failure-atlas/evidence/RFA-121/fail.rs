fn accepts_any_borrow<F>(callback: F)
where
    F: for<'a> Fn(&'a str) -> &'a str,
{
    assert_eq!(callback("atlas"), "atlas");
}

fn main() {
    let identity = |value: &str| value;
    accepts_any_borrow(identity);
}
