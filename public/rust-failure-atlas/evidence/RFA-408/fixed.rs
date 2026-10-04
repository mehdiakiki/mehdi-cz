use std::io::{self, BufRead};

fn main() -> io::Result<()> {
    let mut input = io::Cursor::new(b"ab\ncd");
    let mut output = vec![b'!'];
    let read = input.read_until(b'\n', &mut output)?;
    assert_eq!(read, 3);
    assert_eq!(output, b"!ab\n".to_vec());
    assert_eq!(input.fill_buf()?, b"cd");
    Ok(())
}
