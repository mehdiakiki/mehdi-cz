use std::io::{self, BufRead};

fn main() -> io::Result<()> {
    let mut input = io::Cursor::new(b"ab\ncd");
    let mut output = vec![b'!'];
    let read = input.read_until(b'\n', &mut output)?;
    assert_eq!(read, 3);
    assert_eq!(output, b"ab".to_vec(), "BufRead::read_until appends to the destination and includes the delimiter");
    Ok(())
}
