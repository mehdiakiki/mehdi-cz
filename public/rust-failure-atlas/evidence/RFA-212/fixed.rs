use std::io::{BufWriter, Write};

fn main() -> std::io::Result<()> {
    let mut writer = BufWriter::with_capacity(8, Vec::new());
    writer.write_all(b"abc")?;

    assert_eq!(writer.buffer(), b"abc");
    assert!(writer.get_ref().is_empty());

    writer.flush()?;
    assert_eq!(writer.get_ref(), b"abc");
    Ok(())
}
