trait Decode {
    fn decode(&self, input: u16) -> u16;
}

struct Codec;

impl Decode for Codec {
    fn decode(&self, input: u16) -> u16 {
        input
    }
}

fn main() {
    assert_eq!(Codec.decode(9), 9);
}
