use std::io::{BufReader, Cursor, Read, Seek};

fn main() {
    let mut reader = BufReader::with_capacity(8, Cursor::new(b"abcdef".to_vec()));
    let mut first = [0_u8; 1];
    reader.read_exact(&mut first).unwrap();

    let logical = reader.stream_position().unwrap();
    let inner = reader.into_inner();

    assert_eq!(
        inner.position(),
        logical,
        "BufReader::stream_position is logical, but into_inner can expose the source's read-ahead position"
    );
}
