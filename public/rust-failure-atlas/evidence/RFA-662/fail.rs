fn main() {
    let mut ids = vec![4, 7, 4, 4, 7];
    ids.dedup();
    assert_eq!(ids, [4, 7],
        "Vec::dedup removes only consecutive equal elements, not every duplicate");
}
