fn main() {
    let result = i32::MIN.overflowing_div(-1);

    assert_eq!(
        result,
        (0, true),
        "overflowing_div returns the wrapped dividend together with true for MIN divided by minus one"
    );
}
