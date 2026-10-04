use std::io::{BufRead, Cursor};

fn main() {
    let mut reader = Cursor::new(b"hello\n");
    let mut line = String::from("prefix:");
    reader.read_line(&mut line).unwrap();

    assert_eq!(line, "hello\n", "BufRead::read_line appends to its String");
}
