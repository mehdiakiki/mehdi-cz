fn main() {
    let values: impl Iterator<Item = u8> = 0_u8..3;
    assert_eq!(values.sum::<u8>(), 3);
}
