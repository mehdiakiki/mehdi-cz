fn main() {
    let text = "éclair";
    let byte_index = text.find('c').unwrap();
    let character_index = text[..byte_index].chars().count();

    assert_eq!(byte_index, 2);
    assert_eq!(character_index, 1);
}
