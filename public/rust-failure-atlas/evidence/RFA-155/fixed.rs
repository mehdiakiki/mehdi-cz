fn main() {
    let mut word = String::from("éclair");
    let boundary = word.char_indices().nth(1).map_or(word.len(), |(index, _)| index);
    word.truncate(boundary);

    assert_eq!(word, "é");
}
