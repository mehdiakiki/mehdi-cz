use std::io::{self, Cursor, Read};

fn main() -> io::Result<()> {
    let first = Cursor::new(&b"A"[..]);
    let second = Cursor::new(&b"B"[..]);
    let mut output = Vec::new();
    first.chain(second).read_to_end(&mut output)?;

    assert_eq!(output, b"AB");
    Ok(())
}
