use std::io::Cursor;

fn main() {
    let mut cursor = Cursor::new(vec![1_u8, 2, 3]);
    cursor.set_position(3);
    cursor.get_mut().truncate(1);

    assert_eq!(cursor.position(), 1, "Cursor::get_mut can shorten the buffer without clamping the independent cursor position");
}
