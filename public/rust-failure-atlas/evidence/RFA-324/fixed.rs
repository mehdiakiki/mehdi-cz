fn main() {
    assert!('A'.eq_ignore_ascii_case(&'a'));
    assert!(!'Ä'.eq_ignore_ascii_case(&'ä'));

    let left: String = 'Ä'.to_lowercase().collect();
    let right: String = 'ä'.to_lowercase().collect();
    assert_eq!(left, right);
}
