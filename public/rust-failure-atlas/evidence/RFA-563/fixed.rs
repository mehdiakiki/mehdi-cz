mod protocol {
    pub struct Header {
        pub version: u8,
    }
}

fn main() {
    let header = protocol::Header { version: 1 };
    assert_eq!(header.version, 1);
}
