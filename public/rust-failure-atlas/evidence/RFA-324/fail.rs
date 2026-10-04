fn main() {
    assert!(
        'Ä'.eq_ignore_ascii_case(&'ä'),
        "char::eq_ignore_ascii_case does not perform Unicode case-insensitive comparison"
    );
}
