fn main() {
    let character = '①';
    assert!(character.is_numeric());
    assert_eq!(
        character.to_digit(10),
        Some(1),
        "char::is_numeric covers more Unicode characters than char::to_digit"
    );
}
