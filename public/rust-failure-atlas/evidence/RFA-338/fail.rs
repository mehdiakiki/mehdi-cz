use std::ffi::CString;

fn main() {
    CString::new(b"left\0right".to_vec())
        .expect("CString::new rejects an interior NUL byte instead of treating it as the terminator");
}
