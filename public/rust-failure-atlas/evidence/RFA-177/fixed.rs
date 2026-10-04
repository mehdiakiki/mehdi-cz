use std::io::{BufRead, Cursor};

fn main() {
    let mut reader = Cursor::new(b"hello\n");
    let mut line = String::from("old contents");
    line.clear();
    let bytes = reader.read_line(&mut line).unwrap();

    assert_eq!(bytes, 6);
    assert_eq!(line, "hello\n");
}
