use std::fs::{self, File};

fn main() {
    let path = std::env::temp_dir().join(format!("rfa-179-{}", std::process::id()));
    fs::write(&path, b"important payload").unwrap();
    let _opened = File::create(&path).unwrap();
    let length = fs::metadata(&path).unwrap().len();

    assert_eq!(
        length, 17,
        "File::create truncates an existing file immediately"
    );
}
