#[cfg(unix)]
fn main() {
    use std::{ffi::OsString, os::unix::ffi::{OsStrExt, OsStringExt}};

    let original = OsString::from_vec(vec![b'o', b'k', 0xff]);
    let recovered = original.into_string().expect_err("the final byte is not UTF-8");
    assert_eq!(recovered.as_bytes(), &[b'o', b'k', 0xff]);
    assert_eq!(recovered.to_string_lossy(), "ok�");
}

#[cfg(not(unix))]
fn main() {}
