fn main() {
    assert_eq!((-13_i32).unbounded_shr(32), -1);
    assert_eq!(13_i32.unbounded_shr(32), 0);
    assert_eq!((-13_i32).checked_shr(32), None);

    let logical = (-13_i32 as u32).unbounded_shr(32);
    assert_eq!(logical, 0);
}
