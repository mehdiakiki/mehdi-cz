fn parse_in_radix(input: &str, radix: u32) -> Result<u32, String> {
    if !(2..=36).contains(&radix) {
        return Err(format!("unsupported radix {radix}"));
    }
    u32::from_str_radix(input, radix).map_err(|error| error.to_string())
}

fn main() {
    assert_eq!(parse_in_radix("10", 1), Err("unsupported radix 1".to_owned()));
    assert_eq!(parse_in_radix("ff", 16), Ok(255));
    assert!(parse_in_radix("2", 2).is_err());
}
