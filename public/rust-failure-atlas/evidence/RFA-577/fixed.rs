fn main() {
    let code_point = 0x1F980_u32;
    let crab = char::from_u32(code_point).expect("valid Unicode scalar value");

    assert_eq!(crab, '🦀');
}
