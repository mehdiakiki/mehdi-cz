trait Source {
    type Item: Clone;
}

struct Bytes;
impl Source for Bytes {
    type Item = Vec<u8>;
}

fn main() {
    let value: <Bytes as Source>::Item = vec![1, 2];
    assert_eq!(value.clone(), value);
}
