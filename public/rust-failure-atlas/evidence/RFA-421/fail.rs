trait Decode {
    fn decode(&self, input: u16) -> u16;
}

struct Codec;

impl Decode for Codec {
    fn decode(&self, input: i16) -> u16 {
        input as u16
    }
}

fn main() {}
