trait Decode {}

struct Packet;

impl Decode for Packet {
    type Error = &'static str;
}

fn main() {}
