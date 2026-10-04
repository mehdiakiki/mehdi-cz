#[cfg(unix)]
fn main() {
    use std::{ffi::OsString, os::unix::ffi::OsStringExt};

    let original = OsString::from_vec(vec![b'o', b'k', 0xff]);
    let converted = original.into_string().expect("every OsString is valid UTF-8");
    assert_eq!(converted, "ok");
}

#[cfg(not(unix))]
fn main() {}
