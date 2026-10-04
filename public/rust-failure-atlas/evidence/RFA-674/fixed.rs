fn main() {
    let mut label = String::from("éclair");
    label.insert(0, 'A');
    let start = label.char_indices().nth(1).unwrap().0;
    let end = label.char_indices().nth(2).unwrap().0;
    label.replace_range(start..end, "E");
    assert_eq!(label, "AEclair");
}
