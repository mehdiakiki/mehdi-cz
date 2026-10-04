fn main() {
    assert_eq!(
        (-7_i32).midpoint(0),
        -4,
        "signed integer midpoint rounds toward zero rather than toward negative infinity"
    );
}
