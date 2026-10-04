fn checked_digit(value: u32, radix: u32) -> Result<Option<char>, &'static str> {
    if radix > 36 {
        return Err("radix must not exceed 36");
    }
    Ok(char::from_digit(value, radix))
}

fn main() {
    assert_eq!(checked_digit(1, 37), Err("radix must not exceed 36"));
    assert_eq!(checked_digit(15, 16), Ok(Some('f')));
    assert_eq!(checked_digit(16, 16), Ok(None));
}
