use std::fs::{self, File};
use std::io::Read;

fn main() {
    let path = std::env::temp_dir().join(format!("rfa-195-{}.txt", std::process::id()));
    fs::write(&path, b"abcdef").unwrap();

    let mut first = File::open(&path).unwrap();
    let mut cloned = first.try_clone().unwrap();
    let mut from_first = [0; 2];
    let mut from_clone = [0; 2];
    first.read_exact(&mut from_first).unwrap();
    cloned.read_exact(&mut from_clone).unwrap();

    drop(first);
    drop(cloned);
    fs::remove_file(path).unwrap();

    assert_eq!(from_first, *b"ab");
    assert_eq!(
        from_clone, *b"ab",
        "File::try_clone shares the underlying cursor instead of opening an independent stream"
    );
}
