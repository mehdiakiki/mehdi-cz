use std::ffi::CString;

fn main() {
    let original = b"left\0right".to_vec();
    let error = CString::new(original.clone()).unwrap_err();

    assert_eq!(error.nul_position(), 4);
    assert_eq!(error.into_vec(), original);

    let value = CString::new(b"leftright".to_vec()).unwrap();
    assert_eq!(value.as_bytes_with_nul(), b"leftright\0");
}
