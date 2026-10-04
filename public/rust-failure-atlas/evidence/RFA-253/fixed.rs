fn select_exactly_one<T>(left: Option<T>, right: Option<T>) -> Result<T, &'static str> {
    match (left, right) {
        (Some(value), None) | (None, Some(value)) => Ok(value),
        (None, None) => Err("no value was supplied"),
        (Some(_), Some(_)) => Err("two values were supplied"),
    }
}

fn main() {
    assert_eq!(select_exactly_one(Some("primary"), Some("secondary")), Err("two values were supplied"));
    assert_eq!(select_exactly_one(Some("primary"), None), Ok("primary"));
}
