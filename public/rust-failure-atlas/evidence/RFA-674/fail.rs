fn main() {
    let mut label = String::from("éclair");
    let first_scalar = 0..2;
    label.insert(0, 'A');
    label.replace_range(first_scalar, "E");
}
