#[repr(u8)]
enum Opcode {
    LastExplicit = 255,
    ImplicitNext,
}

fn main() {
    let _ = Opcode::LastExplicit;
}
