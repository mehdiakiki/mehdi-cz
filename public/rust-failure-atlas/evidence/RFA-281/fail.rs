use std::io::{Cursor, Write};

fn main() {
    let mut storage = [0_u8; 2];
    let mut cursor = Cursor::new(&mut storage[..]);
    cursor
        .write_all(b"abc")
        .expect("Cursor over a fixed slice cannot grow and write_all ends with WriteZero");
}
