use std::fs;

fn main() {
    let path = std::env::temp_dir().join(format!("rfa-345-fail-{}", std::process::id()));
    fs::write(&path, [b'o', b'k', 0xff]).unwrap();
    let result = fs::read_to_string(&path);
    fs::remove_file(&path).unwrap();

    assert!(
        result.is_ok(),
        "fs::read_to_string rejects a file whose bytes are not valid UTF-8"
    );
}
