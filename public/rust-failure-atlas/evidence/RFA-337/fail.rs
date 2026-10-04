fn main() {
    let bytes = [b'o', b'k', 0xe2, 0x82];
    let error = std::str::from_utf8(&bytes).unwrap_err();

    assert_eq!(error.valid_up_to(), 2);
    assert_eq!(
        error.error_len(),
        Some(2),
        "Utf8Error::error_len is None when input ends in a potentially incomplete UTF-8 sequence"
    );
}
