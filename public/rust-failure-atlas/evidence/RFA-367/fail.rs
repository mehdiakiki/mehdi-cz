fn main() {
    let bytes = vec![b'o', b'k', 0xff, b'!'];
    let error = String::from_utf8(bytes).unwrap_err();

    assert!(
        error.as_bytes().is_empty(),
        "FromUtf8Error retains the complete Vec that failed validation instead of discarding the input"
    );
}
