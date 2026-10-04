fn main() {
    assert!(
        u32::MAX.checked_next_power_of_two().is_some(),
        "checked_next_power_of_two returns None when the next power cannot fit"
    );
}
