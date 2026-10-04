use std::ffi::CStr;

fn main() {
    let name = CStr::from_bytes_until_nul(b"worker\0trailing").unwrap();

    assert_eq!(name.to_bytes(), b"worker");
}
