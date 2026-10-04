use std::ffi::CStr;

fn main() {
    let name = CStr::from_bytes_with_nul(b"worker\0trailing")
        .expect("from_bytes_with_nul rejects data after the terminator");

    assert_eq!(name.to_bytes(), b"worker");
}
