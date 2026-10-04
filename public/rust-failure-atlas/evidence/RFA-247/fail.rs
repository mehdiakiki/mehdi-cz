fn main() {
    let text = "banana";
    assert!(
        !text.starts_with(&['a', 'b'][..]),
        "a char-slice Pattern means any listed character, not their sequence"
    );
}
