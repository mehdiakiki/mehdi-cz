fn main() {
    let mut left = [10, 20, 30].into_iter().filter(|_| true);
    let paired = left.by_ref().zip([1]).collect::<Vec<_>>();

    assert_eq!(paired, vec![(10, 1)]);
    assert_eq!(
        left.next(),
        Some(20),
        "zip can consume one extra item from its first iterator when the second ends"
    );
}
