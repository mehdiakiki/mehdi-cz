use std::io::{Cursor, Read};

fn main() {
    let mut reader = Cursor::new(b"abcdefgh".to_vec()).take(5);
    let mut prefix = [0_u8; 3];
    reader.read_exact(&mut prefix).unwrap();
    assert_eq!(&prefix, b"abc");
    assert_eq!(reader.limit(), 2);

    reader.set_limit(5);
    let mut rest = Vec::new();
    reader.read_to_end(&mut rest).unwrap();

    assert_eq!(
        rest,
        b"de",
        "set_limit replaces the remaining budget; it does not restore the original total cap"
    );
}
