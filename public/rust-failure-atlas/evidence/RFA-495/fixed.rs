trait Encode {
    fn encode(&self) -> Vec<u8>;
}

struct Packet(u8);

impl Encode for Packet {
    fn encode(&self) -> Vec<u8> {
        vec![self.0]
    }
}

fn main() {
    assert_eq!(Packet(7).encode(), vec![7]);
}
