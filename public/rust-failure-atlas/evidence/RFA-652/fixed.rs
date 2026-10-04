fn truncate_checked(value: &mut String, new_len: usize) -> bool {
    if value.is_char_boundary(new_len) {
        value.truncate(new_len);
        true
    } else {
        false
    }
}

fn main() {
    let mut label = String::from("éclair");
    assert!(!truncate_checked(&mut label, 1));
    assert_eq!(label, "éclair");
}
