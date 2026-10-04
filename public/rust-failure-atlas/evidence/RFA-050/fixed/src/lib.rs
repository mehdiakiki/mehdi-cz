#[cfg(test)]
fn test_only_helper() -> u8 {
    42
}

/// Return the stable value exposed by this library.
///
/// ```
/// assert_eq!(rfa_050_fixed::public_value(), 42);
/// ```
pub fn public_value() -> u8 {
    42
}

#[cfg(test)]
mod tests {
    #[test]
    fn unit_test_can_keep_using_its_private_helper() {
        assert_eq!(super::test_only_helper(), 42);
    }
}
