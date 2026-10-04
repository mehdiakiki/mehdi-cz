#[repr(u8)]
enum Opcode {
    LastExplicit = 254,
    ImplicitNext,
}

fn main() {
    assert_eq!(Opcode::LastExplicit as u8, 254);
    assert_eq!(Opcode::ImplicitNext as u8, 255);
}
