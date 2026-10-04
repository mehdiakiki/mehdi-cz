use std::io::{BufReader, Cursor, Read};

fn main() {
    let inner = Cursor::new(b"abcdef".to_vec());
    let mut buffered = BufReader::with_capacity(8, inner);
    let mut first = [0_u8; 1];
    buffered.read_exact(&mut first).unwrap();

    let mut remaining = Vec::new();
    buffered.read_to_end(&mut remaining).unwrap();
    assert_eq!(first, *b"a");
    assert_eq!(remaining, b"bcdef");

    let inner = buffered.into_inner();
    assert_eq!(inner.position(), 6);
}
