fn main() {
    let candidates = [("first", 10), ("middle", 4), ("last", 10)];
    let winner = candidates
        .into_iter()
        .reduce(|best, candidate| {
            if candidate.1 > best.1 {
                candidate
            } else {
                best
            }
        })
        .unwrap();

    assert_eq!(winner.0, "first");
}
