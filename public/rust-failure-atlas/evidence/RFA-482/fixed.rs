trait Decode {
    type Error;
    fn decode(&self) -> Result<(), Self::Error>;
}

struct Packet;

impl Decode for Packet {
    type Error = &'static str;
    fn decode(&self) -> Result<(), Self::Error> { Ok(()) }
}

fn main() { assert!(Packet.decode().is_ok()); }
