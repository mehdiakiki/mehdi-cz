use std::io::{BufRead, BufReader, Cursor};

fn main() {
    let mut reader = BufReader::with_capacity(3, Cursor::new(b"abcdef"));
    let first = reader.fill_buf().unwrap().to_vec();
    reader.consume(first.len());
    let second = reader.fill_buf().unwrap().to_vec();

    assert_eq!(first, b"abc");
    assert_eq!(second, b"def");
}
