fn main() {
    let text = "éclair";
    let end = text.char_indices().nth(1).map_or(text.len(), |(index, _)| index);
    let prefix = text.get(0..end).expect("derived boundaries are valid");
    assert_eq!(prefix, "é");
}
