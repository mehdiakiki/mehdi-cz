use std::io::{BufRead, BufReader, Cursor};

fn main() {
    let source = Cursor::new(b"ready".to_vec());
    let mut reader = BufReader::new(source);

    assert!(reader.buffer().is_empty());
    assert_eq!(reader.fill_buf().unwrap(), b"ready");
    assert_eq!(reader.buffer(), b"ready");

    reader.consume(5);
    assert!(reader.buffer().is_empty());
    assert!(reader.fill_buf().unwrap().is_empty());
}
