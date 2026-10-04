#[repr(C, packed)]
struct Header {
    kind: u8,
    length: u32,
}

fn main() {
    let header = Header { kind: 1, length: 512 };
    println!("{}", { header.length });
}
