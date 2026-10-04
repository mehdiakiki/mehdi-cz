fn checked_domain_pow(base: u32, exponent: u32) -> Option<u32> {
    if base == 0 && exponent == 0 {
        return None;
    }
    base.checked_pow(exponent)
}

fn main() {
    assert_eq!(0_u32.pow(0), 1);
    assert_eq!(checked_domain_pow(0, 0), None);
    assert_eq!(checked_domain_pow(2, 10), Some(1024));
}
