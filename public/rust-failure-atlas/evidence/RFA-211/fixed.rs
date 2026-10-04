fn main() {
    let text = "ababa";
    let pattern = "aba";
    let positions = text
        .char_indices()
        .map(|(index, _)| index)
        .filter(|index| text[*index..].starts_with(pattern))
        .collect::<Vec<_>>();

    assert_eq!(positions, [0, 2]);
}
