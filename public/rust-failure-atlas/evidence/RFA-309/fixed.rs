fn split_nonempty<'a>(input: &'a str, delimiter: &str) -> Option<(&'a str, &'a str)> {
    if delimiter.is_empty() {
        return None;
    }
    input.split_once(delimiter)
}

fn main() {
    assert_eq!("rust".split_once(""), Some(("", "rust")));
    assert_eq!("rust".rsplit_once(""), Some(("rust", "")));
    assert_eq!(split_nonempty("rust", ""), None);
    assert_eq!(split_nonempty("rust:atlas", ":"), Some(("rust", "atlas")));
}
