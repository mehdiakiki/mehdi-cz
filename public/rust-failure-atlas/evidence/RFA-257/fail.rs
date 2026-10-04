fn main() {
    assert!(u32::MIN.checked_ilog2().is_some(), "checked_ilog2 returns None for zero");
}
