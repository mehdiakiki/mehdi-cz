fn main() {
    let equal = match (3, 3) {
        (left, right) if left == right => true,
        _ => false,
    };
    assert!(equal);
}
