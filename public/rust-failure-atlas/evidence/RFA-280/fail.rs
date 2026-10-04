use std::io::{self, Read};

struct LateByte {
    calls: usize,
}

impl Read for LateByte {
    fn read(&mut self, output: &mut [u8]) -> io::Result<usize> {
        self.calls += 1;
        if self.calls == 1 || output.is_empty() {
            return Ok(0);
        }
        output[0] = b'A';
        Ok(1)
    }
}

fn main() -> io::Result<()> {
    let first = LateByte { calls: 0 };
    let second = &b"B"[..];
    let mut output = Vec::new();
    first.chain(second).read_to_end(&mut output)?;

    assert_eq!(output, b"AB", "Read::chain switches permanently to the second reader after the first Ok(0)");
    Ok(())
}
