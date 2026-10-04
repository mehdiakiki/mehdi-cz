fn main() {
    let mut values = vec!["a", "b", "c"];
    values.extend_from_within(0..2);
    assert_eq!(values, vec!["a", "b", "c", "a", "b", "a"], "extend_from_within clones the selected original range once; appended elements do not recursively extend that range");
}
