fn main() {
    let mut values = [10, 20, 30].into_iter().filter(|_| true);
    let paired = [1].into_iter().zip(values.by_ref()).collect::<Vec<_>>();

    assert_eq!(paired, vec![(1, 10)]);
    assert_eq!(values.next(), Some(20));
    assert_eq!(values.next(), Some(30));
}
