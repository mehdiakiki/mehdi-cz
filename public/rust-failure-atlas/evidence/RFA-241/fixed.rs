fn main() {
    let source = [7_u8, 8];
    let mut destination = [0_u8; 3];
    destination[..source.len()].copy_from_slice(&source);
    assert_eq!(destination, [7, 8, 0]);
}
