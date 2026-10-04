fn main() {
    let selected = Some("primary").xor(Some("secondary"));
    assert_eq!(
        selected,
        Some("primary"),
        "Option::xor returns None when both operands are Some"
    );
}
