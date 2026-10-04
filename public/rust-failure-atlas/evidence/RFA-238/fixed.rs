fn main() {
    let input = "éé";
    assert_eq!(input.chars().count(), 2);
    assert_eq!(input.len(), 4);

    let mut text = String::with_capacity(input.len());
    let initial_capacity = text.capacity();
    text.push_str(input);
    assert_eq!(text, input);
    assert!(initial_capacity >= input.len());
    assert_eq!(text.capacity(), initial_capacity);
}
