#[derive(Debug, PartialEq)]
enum PollItem {
    Value(u8),
    Pending,
}

fn main() {
    let mut values = [PollItem::Value(1), PollItem::Pending, PollItem::Value(2)].into_iter();
    assert_eq!(values.next(), Some(PollItem::Value(1)));
    assert_eq!(values.next(), Some(PollItem::Pending));
    assert_eq!(values.next(), Some(PollItem::Value(2)));
    assert_eq!(values.next(), None);

    let mut finite = [1_u8, 2].into_iter().fuse();
    assert_eq!(finite.by_ref().collect::<Vec<_>>(), vec![1, 2]);
    assert_eq!(finite.next(), None);
}
