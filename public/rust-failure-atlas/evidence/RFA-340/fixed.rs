use std::io::{BufReader, Cursor, Read, Seek, SeekFrom};

fn main() {
    let mut reader = BufReader::with_capacity(8, Cursor::new(b"abcdef".to_vec()));
    let mut first = [0_u8; 1];
    reader.read_exact(&mut first).unwrap();

    assert_eq!(reader.stream_position().unwrap(), 1);
    assert_eq!(reader.seek(SeekFrom::Current(0)).unwrap(), 1);

    let mut inner = reader.into_inner();
    assert_eq!(inner.position(), 1);
    let mut remainder = String::new();
    inner.read_to_string(&mut remainder).unwrap();
    assert_eq!(remainder, "bcdef");
}
