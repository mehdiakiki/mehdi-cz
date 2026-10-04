struct Packet {
    id: u64,
}

fn main() {
    let packet = Packet { id: 7 };
    assert_eq!(packet.id, 7);
}
