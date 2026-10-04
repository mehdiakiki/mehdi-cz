fn main() {
    let mut pending = vec!["a", "b"];
    let mut incoming = vec!["c", "d"];
    pending.append(&mut incoming);
    assert_eq!(incoming, ["c", "d"],
        "Vec::append moves every element and leaves the source vector empty");
}
