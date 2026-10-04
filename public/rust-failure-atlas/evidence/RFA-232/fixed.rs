fn main() {
    assert_eq!("true".parse::<bool>(), Ok(true));
    assert_eq!("false".parse::<bool>(), Ok(false));
    assert!("TRUE".parse::<bool>().is_err());

    let normalized = "TRUE".to_ascii_lowercase().parse::<bool>();
    assert_eq!(normalized, Ok(true));
}
