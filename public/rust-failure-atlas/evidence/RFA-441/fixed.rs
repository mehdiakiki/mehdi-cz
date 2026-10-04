fn read(value: Option<u8>) -> Option<u8> {
    let Some(number) = value else {
        return None;
    };
    Some(number)
}

fn main() {
    assert_eq!(read(Some(7)), Some(7));
    assert_eq!(read(None), None);
}
