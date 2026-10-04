fn main() {
    let mut text = String::from("aéb");
    let character_count = text.chars().count();
    let mut visited = Vec::new();

    text.retain(|character| {
        visited.push(character);
        character != 'é'
    });

    assert_eq!(visited.len(), character_count);
    assert_eq!(visited, ['a', 'é', 'b']);
    assert_eq!(text, "ab");
}
