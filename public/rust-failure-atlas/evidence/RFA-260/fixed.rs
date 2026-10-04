fn main() {
    let mut items = [Ok(1_u8), Err("bad item"), Ok(3_u8)].into_iter();
    let collected: Result<Vec<_>, _> = items.by_ref().collect();
    assert_eq!(collected, Err("bad item"));
    assert_eq!(items.next(), Some(Ok(3)));
}
