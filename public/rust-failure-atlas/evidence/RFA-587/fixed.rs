fn main() {
    let values = &[1_usize, 2] as &[usize];
    assert_eq!(values, [1, 2]);
}
