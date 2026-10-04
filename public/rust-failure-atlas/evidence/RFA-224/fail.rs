use std::io::{Cursor, Write};

fn main() -> std::io::Result<()> {
    let mut cursor = Cursor::new(Vec::from(&b"ab"[..]));
    cursor.set_position(5);
    cursor.write_all(b"X")?;

    assert_eq!(
        cursor.into_inner(),
        b"abX",
        "writing beyond a Cursor<Vec<u8>> end zero-fills the gap"
    );
    Ok(())
}
