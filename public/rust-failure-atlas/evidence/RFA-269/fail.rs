fn main() {
    let mut destination = vec![1_u8, 2];
    let mut source = vec![3_u8, 4];
    destination.append(&mut source);
    assert_eq!(source, [3, 4], "Vec::append moves every source element and leaves the source vector empty");
}
