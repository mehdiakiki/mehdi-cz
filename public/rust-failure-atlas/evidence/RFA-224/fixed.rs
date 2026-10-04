use std::io::{Cursor, Write};

fn main() -> std::io::Result<()> {
    let bytes = Vec::from(&b"ab"[..]);
    let end = bytes.len() as u64;
    let mut cursor = Cursor::new(bytes);
    cursor.set_position(end);
    cursor.write_all(b"X")?;
    assert_eq!(cursor.into_inner(), b"abX");

    let mut sparse = Cursor::new(Vec::from(&b"ab"[..]));
    sparse.set_position(5);
    sparse.write_all(b"X")?;
    assert_eq!(sparse.into_inner(), b"ab\0\0\0X");
    Ok(())
}
