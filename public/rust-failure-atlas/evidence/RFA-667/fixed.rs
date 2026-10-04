fn main() {
    let mut pending = vec!["a", "b"];
    let incoming = vec!["c", "d"];
    pending.extend_from_slice(&incoming);
    assert_eq!(incoming, ["c", "d"]);
    assert_eq!(pending, ["a", "b", "c", "d"]);
}
