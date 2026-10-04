use std::{ffi::OsString, os::unix::ffi::OsStringExt};

fn main() {
    let name = OsString::from_vec(vec![b'f', 0x80, b'o']);

    assert!(
        name.to_str().is_some(),
        "OsStr::to_str returns None for Unix strings that are not valid UTF-8"
    );
}
