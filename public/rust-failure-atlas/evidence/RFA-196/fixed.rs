use std::fs::{self, OpenOptions};
use std::io::{ErrorKind, Write};

fn main() {
    let path = std::env::temp_dir().join(format!("rfa-196-{}.txt", std::process::id()));
    fs::write(&path, b"keep me").unwrap();

    let protected = OpenOptions::new()
        .write(true)
        .truncate(true)
        .create_new(true)
        .open(&path);
    assert_eq!(protected.unwrap_err().kind(), ErrorKind::AlreadyExists);
    assert_eq!(fs::read(&path).unwrap(), b"keep me");

    let mut replacement = OpenOptions::new()
        .write(true)
        .truncate(true)
        .open(&path)
        .unwrap();
    replacement.write_all(b"new").unwrap();
    drop(replacement);
    assert_eq!(fs::read(&path).unwrap(), b"new");
    fs::remove_file(path).unwrap();
}
