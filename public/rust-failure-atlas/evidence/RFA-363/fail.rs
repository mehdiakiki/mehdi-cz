fn main() {
    let shifted = 42_i32.unbounded_shl(32);

    assert_eq!(
        shifted,
        42,
        "unbounded_shl shifts every bit out when the count reaches the type width; it does not mask the count"
    );
}
