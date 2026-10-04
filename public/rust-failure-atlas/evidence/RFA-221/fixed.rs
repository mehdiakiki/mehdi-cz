fn main() {
    let text = "aé";

    let characters: Vec<_> = text.chars().collect();
    assert_eq!(characters, ['a', 'é']);

    let split_parts: Vec<_> = text.split("").collect();
    assert_eq!(split_parts, ["", "a", "é", ""]);
}
