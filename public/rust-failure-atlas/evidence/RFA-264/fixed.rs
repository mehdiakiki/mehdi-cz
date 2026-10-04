fn main() {
    assert_eq!(i32::MIN.checked_abs(), None);
    assert_eq!(i32::MIN.unsigned_abs(), 2_147_483_648_u32);
    assert_eq!((-7_i32).checked_abs(), Some(7));
}
