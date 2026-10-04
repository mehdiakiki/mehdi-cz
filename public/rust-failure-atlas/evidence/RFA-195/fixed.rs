use std::fs::{self, File};
use std::io::Read;

fn main() {
    let path = std::env::temp_dir().join(format!("rfa-195-{}.txt", std::process::id()));
    fs::write(&path, b"abcdef").unwrap();

    let mut first = File::open(&path).unwrap();
    let mut independent = File::open(&path).unwrap();
    let mut from_first = [0; 2];
    let mut from_independent = [0; 2];
    first.read_exact(&mut from_first).unwrap();
    independent.read_exact(&mut from_independent).unwrap();

    drop(first);
    drop(independent);
    fs::remove_file(path).unwrap();

    assert_eq!(from_first, *b"ab");
    assert_eq!(from_independent, *b"ab");
}
