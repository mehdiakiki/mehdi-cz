struct Packet(u8);

fn main() {
    let Packet(value) = Packet(7);
    assert_eq!(value, 7);
}
