fn accepts<F>(callback: F) -> bool
where
    F: for<'a> Fn(&'a str) -> Option<&'a str>,
{
    callback("ready") == Some("ready")
}

fn identity(value: &str) -> Option<&str> {
    Some(value)
}

fn main() {
    assert!(accepts(identity));
}
