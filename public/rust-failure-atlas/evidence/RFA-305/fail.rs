use std::{fs, os::unix::fs::symlink};

fn main() {
    let directory = std::env::temp_dir().join(format!("rfa-305-{}", std::process::id()));
    let target = directory.join("target.txt");
    let link = directory.join("link.txt");
    fs::create_dir(&directory).unwrap();
    fs::write(&target, b"atlas").unwrap();
    symlink("target.txt", &link).unwrap();

    let is_symlink = fs::metadata(&link).unwrap().file_type().is_symlink();

    fs::remove_file(&link).unwrap();
    fs::remove_file(&target).unwrap();
    fs::remove_dir(&directory).unwrap();

    assert!(
        is_symlink,
        "fs::metadata follows a symbolic link; symlink_metadata inspects the link itself"
    );
}
