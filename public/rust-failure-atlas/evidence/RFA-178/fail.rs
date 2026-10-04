use std::io::{self, ErrorKind, Read};

struct OneByteThenEof(bool);

impl Read for OneByteThenEof {
    fn read(&mut self, buffer: &mut [u8]) -> io::Result<usize> {
        if self.0 || buffer.is_empty() {
            return Ok(0);
        }
        buffer[0] = b'a';
        self.0 = true;
        Ok(1)
    }
}

fn main() {
    let mut reader = OneByteThenEof(false);
    let mut frame = [9_u8; 4];
    let error = reader.read_exact(&mut frame).unwrap_err();

    assert_eq!(error.kind(), ErrorKind::UnexpectedEof);
    assert_eq!(
        frame,
        [9, 9, 9, 9],
        "read_exact may modify its buffer before returning UnexpectedEof"
    );
}
