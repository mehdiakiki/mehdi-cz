fn main() {
    let candidates = [("first", 10), ("middle", 4), ("last", 10)];
    let winner = candidates
        .into_iter()
        .max_by_key(|(_, score)| *score)
        .unwrap();

    assert_eq!(
        winner.0, "first",
        "Iterator::max_by_key returns the last equal maximum"
    );
}
