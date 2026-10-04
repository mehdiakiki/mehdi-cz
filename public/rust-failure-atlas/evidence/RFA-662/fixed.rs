fn main() {
    let mut ids = vec![4, 7, 4, 4, 7];
    ids.sort_unstable();
    ids.dedup();
    assert_eq!(ids, [4, 7]);
}
