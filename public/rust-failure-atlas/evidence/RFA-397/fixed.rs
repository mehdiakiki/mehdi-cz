fn main() {
    let mut left = [1, 9, 100].into_iter();
    let mut right = [1, 2, 200].into_iter();
    assert!(left.by_ref().cmp(right.by_ref()).is_gt());
    assert_eq!(left.collect::<Vec<_>>(), [100]);
    assert_eq!(right.collect::<Vec<_>>(), [200]);
}
