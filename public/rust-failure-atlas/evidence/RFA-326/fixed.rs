use std::{ffi::OsString, os::unix::ffi::OsStringExt};

fn main() {
    let name = OsString::from_vec(vec![b'f', 0x80, b'o']);

    assert_eq!(name.to_str(), None);
    assert_eq!(name.to_string_lossy(), "f\u{fffd}o");
    assert_eq!(name.into_vec(), vec![b'f', 0x80, b'o']);
}
