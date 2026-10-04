fn main() {
    let mut word = String::from("éclair");
    word.truncate(1);

    assert_eq!(word, "é");
}
