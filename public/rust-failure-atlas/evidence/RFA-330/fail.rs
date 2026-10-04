use std::io::{BufReader, Cursor, Read};

fn main() {
    let inner = Cursor::new(b"abcdef".to_vec());
    let mut buffered = BufReader::with_capacity(8, inner);
    let mut first = [0_u8; 1];
    buffered.read_exact(&mut first).unwrap();
    assert_eq!(first, *b"a");
    assert!(!buffered.buffer().is_empty());

    let mut inner = buffered.into_inner();
    let mut remaining = Vec::new();
    inner.read_to_end(&mut remaining).unwrap();

    assert_eq!(
        remaining,
        b"bcdef",
        "BufReader::into_inner discards unread buffered bytes while the underlying reader is already advanced"
    );
}
