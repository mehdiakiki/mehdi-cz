use std::fs::{self, OpenOptions};

fn main() {
    let path = std::env::temp_dir().join(format!("rfa-196-{}.txt", std::process::id()));
    fs::write(&path, b"keep me").unwrap();

    let opened = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .create_new(true)
        .open(&path);
    let contents = fs::read(&path).unwrap();
    fs::remove_file(path).unwrap();

    assert!(
        opened.is_ok(),
        "OpenOptions::create_new takes precedence over create and truncate when the file exists"
    );
    assert!(contents.is_empty());
}
