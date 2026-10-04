#[cfg(test)]
pub fn test_only_helper() -> u8 {
    42
}

/// Return the stable value exposed by this library.
///
/// ```
/// assert_eq!(rfa_050_fail::test_only_helper(), 42);
/// ```
pub fn public_value() -> u8 {
    42
}

#[cfg(test)]
mod tests {
    #[test]
    fn unit_test_sees_cfg_test_items() {
        assert_eq!(super::test_only_helper(), 42);
    }
}
