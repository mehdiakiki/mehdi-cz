use std::io::{self, Write};

fn main() -> io::Result<()> {
    let mut writer = io::LineWriter::with_capacity(8, Vec::new());
    writer.write_all(b"abc")?;
    assert!(writer.get_ref().is_empty());
    writer.write_all(b"\n")?;
    assert_eq!(writer.get_ref(), b"abc\n");
    writer.write_all(b"tail")?;
    assert_eq!(writer.get_ref(), b"abc\n");
    writer.flush()?;
    assert_eq!(writer.get_ref(), b"abc\ntail");
    Ok(())
}
