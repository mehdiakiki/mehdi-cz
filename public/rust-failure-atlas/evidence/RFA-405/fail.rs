fn main() {
    let mut values = Vec::with_capacity(10);
    values.extend([1_u8, 2]);
    values.reserve(9);
    assert_eq!(values.capacity(), 10, "Vec::reserve guarantees room relative to length, not spare capacity relative to current capacity");
}
