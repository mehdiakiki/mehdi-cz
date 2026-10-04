use std::io::{Cursor, Write};

fn main() {
    let mut output = Cursor::new(vec![1_u8, 2, 3]);
    output.set_position(output.get_ref().len() as u64);
    output.write_all(&[9, 8]).unwrap();

    assert_eq!(output.into_inner(), vec![1, 2, 3, 9, 8]);
}
