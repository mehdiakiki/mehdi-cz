fn main() {
    assert!("".parse::<char>().is_err());
    assert_eq!("é".parse::<char>(), Ok('é'));
    assert!("ab".parse::<char>().is_err());
}
