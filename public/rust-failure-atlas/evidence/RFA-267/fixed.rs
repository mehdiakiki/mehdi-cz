use std::io::{Cursor, Read};

fn main() {
    let mut cursor = Cursor::new(b"abc".to_vec());
    cursor.set_position(10);
    let mut byte = [0_u8; 1];
    assert_eq!(cursor.read(&mut byte).unwrap(), 0);
    assert_eq!(cursor.position(), 10);
}
