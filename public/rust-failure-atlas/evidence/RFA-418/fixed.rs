fn read(value: Option<u8>) -> Option<u8> {
    let Some(value) = value else { return None };
    Some(value + 1)
}

fn main() {
    assert_eq!(read(Some(7)), Some(8));
    assert_eq!(read(None), None);
}
