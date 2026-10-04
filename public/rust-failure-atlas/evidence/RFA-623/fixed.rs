use std::mem::ManuallyDrop;

union Packet {
    text: ManuallyDrop<String>,
    code: u32,
}

fn main() {
    let packet = Packet { code: 7 };
    assert_eq!(unsafe { packet.code }, 7);
}
