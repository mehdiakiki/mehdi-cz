trait Encode {
    fn encode(&self) -> Vec<u8>;
}

struct Packet(u8);

impl Encode for Packet {
    fn encode(&self) -> Vec<u8> {
        vec![self.0]
    }

    fn encode(&self) -> Vec<u8> {
        self.0.to_be_bytes().to_vec()
    }
}

fn main() {}
