use std::io::{self, Write};

#[derive(Default)]
struct ShortWriter {
    bytes: Vec<u8>,
}

impl Write for ShortWriter {
    fn write(&mut self, input: &[u8]) -> io::Result<usize> {
        let written = input.len().min(3);
        self.bytes.extend_from_slice(&input[..written]);
        Ok(written)
    }

    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

fn main() {
    let mut output = ShortWriter::default();
    output.write_all(b"abcdef").unwrap();

    assert_eq!(output.bytes, b"abcdef");
}
