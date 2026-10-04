fn main() {
    let classified_number = '①';
    assert!(classified_number.is_numeric());
    assert_eq!(classified_number.to_digit(10), None);

    let radix_digit = '1';
    assert!(radix_digit.is_ascii_digit());
    assert_eq!(radix_digit.to_digit(10), Some(1));
}
