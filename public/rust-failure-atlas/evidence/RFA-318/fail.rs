use std::io::{self, BufWriter, Write};

#[derive(Debug, Default)]
struct Probe {
    bytes: Vec<u8>,
    flush_calls: usize,
}

impl Write for Probe {
    fn write(&mut self, input: &[u8]) -> io::Result<usize> {
        self.bytes.extend_from_slice(input);
        Ok(input.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        self.flush_calls += 1;
        Ok(())
    }
}

fn main() {
    let mut buffered = BufWriter::with_capacity(32, Probe::default());
    buffered.write_all(b"atlas").unwrap();
    let probe = buffered.into_inner().unwrap();

    assert_eq!(probe.bytes, b"atlas");
    assert_eq!(
        probe.flush_calls,
        1,
        "BufWriter::into_inner writes its own buffer but does not call flush on the underlying writer"
    );
}
