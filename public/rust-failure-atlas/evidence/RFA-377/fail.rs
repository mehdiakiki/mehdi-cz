fn main() {
    let shifted = (-13_i32).unbounded_shr(32);
    assert_eq!(
        shifted,
        0,
        "unbounded_shr sign-extends a negative signed value, so shifting every original bit out yields -1"
    );
}
