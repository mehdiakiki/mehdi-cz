use std::io::{BufRead, Cursor};

fn main() {
    let mut input = Cursor::new(b"abc|rest");
    let skipped = input.skip_until(b'|').expect("in-memory read succeeds");

    assert_eq!(
        skipped, 3,
        "BufRead::skip_until includes the delimiter byte in its returned count"
    );
}
