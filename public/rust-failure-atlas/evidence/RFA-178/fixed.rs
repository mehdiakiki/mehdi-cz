use std::io::{Cursor, Read};

fn main() {
    let mut reader = Cursor::new(b"ab");
    let committed = [9_u8; 4];
    let mut staging = Vec::new();
    reader.read_to_end(&mut staging).unwrap();

    assert_eq!(staging, b"ab");
    assert_eq!(committed, [9, 9, 9, 9]);
    assert_ne!(staging.len(), committed.len());
}
