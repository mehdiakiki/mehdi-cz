fn main() {
    let mut values = Vec::with_capacity(10);
    values.extend([1_u8, 2]);
    let required = values.len() + 9;
    values.reserve(9);
    assert!(values.capacity() >= required);
    assert!(values.capacity() >= values.len());
}
