use std::io::{self, BufWriter, Write};

struct FailingWriter;

impl Write for FailingWriter {
    fn write(&mut self, _bytes: &[u8]) -> io::Result<usize> {
        Err(io::Error::other("storage rejected write"))
    }

    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

fn main() {
    let mut output = BufWriter::new(FailingWriter);
    output.write_all(b"accepted into memory").unwrap();
    let error = output.flush().expect_err("the underlying write must fail");
    assert_eq!(io::ErrorKind::Other, error.kind());
}
