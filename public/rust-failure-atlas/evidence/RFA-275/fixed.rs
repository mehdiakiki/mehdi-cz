use std::io::Cursor;

fn main() {
    let mut cursor = Cursor::new(vec![1_u8, 2, 3]);
    cursor.set_position(3);
    cursor.get_mut().truncate(1);

    let valid_position = cursor.position().min(cursor.get_ref().len() as u64);
    cursor.set_position(valid_position);

    assert_eq!(cursor.get_ref(), &[1]);
    assert_eq!(cursor.position(), 1);
}
