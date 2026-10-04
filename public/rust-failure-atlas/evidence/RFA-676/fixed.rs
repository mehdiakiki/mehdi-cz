use std::ffi::CString;

fn main() {
    let value = CString::new("alpha omega").expect("input contains no interior NUL");
    assert_eq!(value.as_bytes(), b"alpha omega");
    assert_eq!(value.as_bytes_with_nul().last(), Some(&0));
}
