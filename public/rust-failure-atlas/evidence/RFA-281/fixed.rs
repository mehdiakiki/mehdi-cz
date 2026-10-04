use std::io::{Cursor, Write};

fn main() -> std::io::Result<()> {
    let mut cursor = Cursor::new(Vec::<u8>::new());
    cursor.write_all(b"abc")?;

    assert_eq!(cursor.into_inner(), b"abc");
    Ok(())
}
