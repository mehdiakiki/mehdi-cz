use std::io::{self, Write};

fn main() -> io::Result<()> {
    let mut writer = io::LineWriter::with_capacity(8, Vec::new());
    writer.write_all(b"abc")?;
    assert!(writer.get_ref().is_empty());
    writer.write_all(b"\n")?;
    assert!(writer.get_ref().is_empty(), "LineWriter sends a completed newline-terminated line to the inner writer immediately");
    Ok(())
}
