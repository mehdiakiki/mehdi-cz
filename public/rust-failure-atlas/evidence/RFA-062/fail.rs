fn main() {
    let mut outside: Vec<&str> = Vec::new();
    let mut push = |value: &str| outside.push(value);
    push("atlas");
}
