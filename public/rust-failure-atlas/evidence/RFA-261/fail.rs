fn main() {
    let mut values = [2_u8, 3, 4].into_iter();
    assert!(!values.by_ref().all(|value| value % 2 == 0));
    assert!(values.next().is_none(), "Iterator::all short-circuits and leaves items after the first false predicate unvisited");
}
