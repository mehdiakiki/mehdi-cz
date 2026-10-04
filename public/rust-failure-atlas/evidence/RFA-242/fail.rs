fn main() {
    assert!(
        char::from_u32(0xD800).is_some(),
        "char::from_u32 rejects UTF-16 surrogate code points"
    );
}
