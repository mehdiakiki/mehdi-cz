fn main() {
    let mut values = vec![1_u8];
    values.truncate(3);
    assert_eq!(
        values.len(),
        3,
        "Vec::truncate never grows a vector when the requested length is larger"
    );
}
