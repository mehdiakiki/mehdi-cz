use std::fmt::Display;

trait Encode {}

impl<T: Display> Encode for T {}

struct Bytes(Vec<u8>);

impl Encode for Bytes {}

fn assert_encode<T: Encode>(_value: &T) {}

fn main() {
    let bytes = Bytes(vec![1, 2]);
    assert_encode(&bytes);
    assert_eq!(bytes.0, [1, 2]);
}
