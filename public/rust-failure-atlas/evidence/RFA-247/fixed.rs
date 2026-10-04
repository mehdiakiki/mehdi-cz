fn main() {
    let text = "banana";
    assert!(text.starts_with(&['a', 'b'][..]));
    assert!(!text.starts_with("ab"));
    assert!(text.starts_with('b'));
}
