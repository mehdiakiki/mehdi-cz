fn main() {
    let mut destination = [0_u8; 3];
    let source = [8, 9];
    destination[..source.len()].copy_from_slice(&source);
    assert_eq!(destination, [8, 9, 0]);
}
