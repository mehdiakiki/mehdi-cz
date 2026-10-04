use std::fs;

fn main() {
    let path = std::env::temp_dir().join(format!("rfa-345-fixed-{}", std::process::id()));
    fs::write(&path, [b'o', b'k', 0xff]).unwrap();

    let bytes = fs::read(&path).unwrap();
    fs::remove_file(&path).unwrap();
    assert_eq!(bytes, [b'o', b'k', 0xff]);
    assert_eq!(String::from_utf8_lossy(&bytes), "ok\u{fffd}");
}
