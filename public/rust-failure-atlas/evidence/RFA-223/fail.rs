fn main() {
    assert_eq!(
        u8::MAX.checked_shl(1),
        None,
        "checked_shl validates the shift amount, not whether high bits are discarded"
    );
}
