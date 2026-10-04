use std::io::{BufWriter, Write};

fn main() {
    let mut buffered = BufWriter::with_capacity(32, Vec::new());
    buffered.write_all(b"buffered").unwrap();
    assert_eq!(buffered.get_ref(), b"");

    buffered.get_mut().write_all(b"direct").unwrap();
    buffered.flush().unwrap();

    assert_eq!(
        buffered.get_ref(),
        b"buffereddirect",
        "writing through BufWriter::get_mut can place direct bytes before bytes still held in the buffer"
    );
}
