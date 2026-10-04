use std::{fs, os::unix::fs::PermissionsExt};

fn main() {
    let path = std::env::temp_dir().join(format!("rfa-316-{}", std::process::id()));
    fs::write(&path, b"atlas").unwrap();
    fs::set_permissions(&path, fs::Permissions::from_mode(0o444)).unwrap();

    fs::set_permissions(&path, fs::Permissions::from_mode(0o644)).unwrap();
    let mode = fs::metadata(&path).unwrap().permissions().mode() & 0o777;

    fs::remove_file(&path).unwrap();
    assert_eq!(mode, 0o644);
}
