fn main() {
    let mut items = [Ok(1_u8), Err("bad item"), Ok(3_u8)].into_iter();
    let collected: Result<Vec<_>, _> = items.by_ref().collect();
    assert_eq!(collected, Err("bad item"));
    assert!(items.next().is_none(), "collecting Result stops at the first Err and leaves later iterator items unvisited");
}
