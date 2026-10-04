unsafe trait TrustedBytes {}
struct Packet([u8; 4]);

impl TrustedBytes for Packet {}

fn main() {}
