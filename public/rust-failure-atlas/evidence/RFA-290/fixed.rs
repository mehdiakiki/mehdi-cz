use std::io::{BufRead, Cursor, Read};

fn main() {
    let mut input = Cursor::new(b"abc|rest");
    let skipped = input.skip_until(b'|').expect("in-memory read succeeds");
    let mut remainder = String::new();
    input.read_to_string(&mut remainder).unwrap();

    assert_eq!(skipped, 4);
    assert_eq!(remainder, "rest");
}
