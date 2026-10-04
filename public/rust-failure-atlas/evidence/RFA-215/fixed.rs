fn main() {
    let uppercase = 'ß'.to_uppercase().collect::<String>();

    assert_eq!(uppercase, "SS");
    assert_eq!('ß'.to_ascii_uppercase(), 'ß');
}
