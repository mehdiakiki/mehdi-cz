fn main() {
    assert_eq!(17_u32.checked_next_power_of_two(), Some(32));
    assert_eq!(u32::MAX.checked_next_power_of_two(), None);
}
