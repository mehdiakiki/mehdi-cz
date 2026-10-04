fn main() {
    let mut left = [1, 9, 100].into_iter();
    let mut right = [1, 2, 200].into_iter();
    assert!(left.by_ref().cmp(right.by_ref()).is_gt());
    assert_eq!(left.next(), None, "Iterator::cmp stops after consuming the first mismatching pair and leaves both remainders available");
}
