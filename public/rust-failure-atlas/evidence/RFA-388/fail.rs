fn main() {
    let (value, overflowed) = (-13_i32).overflowing_shr(32);
    assert_eq!(
        (value, overflowed),
        (-13, false),
        "overflowing_shr masks the count for its value and separately reports that the original count overflowed"
    );
}
