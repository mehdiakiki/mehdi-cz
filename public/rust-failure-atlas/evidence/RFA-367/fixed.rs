fn main() {
    let bytes = vec![b'o', b'k', 0xff, b'!'];
    let error = String::from_utf8(bytes).unwrap_err();

    assert_eq!(error.utf8_error().valid_up_to(), 2);
    assert_eq!(error.utf8_error().error_len(), Some(1));
    assert_eq!(error.into_bytes(), vec![b'o', b'k', 0xff, b'!']);

    let valid = String::from_utf8(b"ready".to_vec()).unwrap();
    assert_eq!(valid, "ready");
}
