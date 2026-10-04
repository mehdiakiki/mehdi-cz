use std::io::{BufWriter, Write};

fn main() {
    let mut buffered = BufWriter::with_capacity(32, Vec::new());
    buffered.write_all(b"buffered").unwrap();
    buffered.flush().unwrap();
    buffered.get_mut().write_all(b"direct").unwrap();

    assert_eq!(buffered.get_ref(), b"buffereddirect");
}
