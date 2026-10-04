fn main() {
    let inferred = 0_u8..3;
    assert_eq!(inferred.sum::<u8>(), 3);

    let erased: Box<dyn Iterator<Item = u8>> = Box::new(0_u8..3);
    assert_eq!(erased.sum::<u8>(), 3);
}
