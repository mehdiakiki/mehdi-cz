fn main() {
    let scalar = 'é';
    let mut buffer = [0_u8; char::MAX_LEN_UTF8];
    let encoded = scalar.encode_utf8(&mut buffer);
    assert_eq!(encoded, "é");
    assert_eq!(encoded.len(), scalar.len_utf8());
}
