fn main() {
    let mut bytes = vec![b'o', b'k', 0xe2, 0x82];
    let error = std::str::from_utf8(&bytes).unwrap_err();

    assert_eq!(error.valid_up_to(), 2);
    assert_eq!(error.error_len(), None);
    bytes.push(0xac);
    assert_eq!(std::str::from_utf8(&bytes).unwrap(), "ok€");
}
