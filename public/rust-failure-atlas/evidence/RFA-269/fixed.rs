fn main() {
    let mut destination = vec![1_u8, 2];
    let mut source = vec![3_u8, 4];
    destination.append(&mut source);
    assert_eq!(destination, [1, 2, 3, 4]);
    assert!(source.is_empty());
}
