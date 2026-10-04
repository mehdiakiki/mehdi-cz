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
    drop(output);
    panic!("BufWriter drop returned without reporting the failed write");
}
