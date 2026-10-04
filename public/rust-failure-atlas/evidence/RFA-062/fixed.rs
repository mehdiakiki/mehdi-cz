fn main() {
    let mut outside: Vec<&str> = Vec::new();
    {
        let mut push = |value| outside.push(value);
        push("atlas");
    }
    assert_eq!(outside, ["atlas"]);
}
