use std::fs::{self, OpenOptions};

fn main() {
    let path = std::env::temp_dir().join(format!("rfa-179-fixed-{}", std::process::id()));
    fs::write(&path, b"important payload").unwrap();
    let _opened = OpenOptions::new().write(true).open(&path).unwrap();

    assert_eq!(fs::read(&path).unwrap(), b"important payload");
    fs::remove_file(path).unwrap();
}
