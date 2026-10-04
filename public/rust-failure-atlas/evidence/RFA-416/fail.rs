use std::io::{self, Read, Seek, SeekFrom};

fn main() -> io::Result<()> {
    let mut reader = io::BufReader::with_capacity(4, io::Cursor::new(b"abcdef"));
    let mut first = [0_u8; 2];
    reader.read_exact(&mut first)?;
    assert_eq!(reader.buffer(), b"cd");
    assert_eq!(reader.seek(SeekFrom::Current(0))?, 2);
    assert_eq!(reader.buffer(), b"cd", "BufReader::seek discards its internal buffer after restoring the logical position");
    Ok(())
}
