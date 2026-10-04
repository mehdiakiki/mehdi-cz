trait Source {
    type Item;
}

struct Bytes;

impl Source for Bytes {
    type Item = u8;
}

fn main() {
    let value: <Bytes as Source>::Item = 7;
    assert_eq!(value, 7);
}
