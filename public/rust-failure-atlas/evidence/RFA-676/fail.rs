use std::ffi::CString;

fn main() {
    let value = CString::new(b"alpha\0omega".to_vec());
    assert!(value.is_ok(),
        "CString::new rejects an interior NUL because it marks the C string terminator");
}
