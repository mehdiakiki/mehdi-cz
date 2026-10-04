mod protocol {
    pub struct Header {
        pub version: u8,
    }
}

fn main() {
    let _header = protocol { version: 1 };
}
