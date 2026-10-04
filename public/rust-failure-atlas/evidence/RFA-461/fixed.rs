trait Encodable {
    fn bytes(&self) -> &'static [u8];
}

struct Packet;

impl Encodable for Packet {
    fn bytes(&self) -> &'static [u8] { b"packet" }
}

fn main() {
    assert_eq!(Packet.bytes(), b"packet");
}
