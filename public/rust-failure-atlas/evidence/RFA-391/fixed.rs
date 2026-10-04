fn main() {
    let mut values = vec![String::from("a"), String::from("b"), String::from("c")];
    values.extend_from_within(0..2);
    assert_eq!(values, ["a", "b", "c", "a", "b"]);
}
