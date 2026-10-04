fn main() {
    assert_eq!(char::from_u32(0xD800), None);
    assert_eq!(char::from_u32(0x1F980), Some('🦀'));
}
