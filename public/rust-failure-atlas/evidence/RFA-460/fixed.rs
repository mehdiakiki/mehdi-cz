trait Encode {
    fn encode(&self) -> &'static str;
}

struct Packet;

impl Encode for Packet {
    fn encode(&self) -> &'static str { "packet" }
}

fn main() {
    assert_eq!(Packet.encode(), "packet");
}
