fn main() {
    let mut values = vec![10, 20, 30, 40];
    let suffix = values.split_off(2);

    assert_eq!(values, [10, 20, 30], "Vec::split_off puts the element at the boundary index in the returned vector");
    assert_eq!(suffix, [40]);
}
