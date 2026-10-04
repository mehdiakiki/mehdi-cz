use std::{fs, os::unix::fs::symlink};

fn main() {
    let directory = std::env::temp_dir().join(format!("rfa-317-{}", std::process::id()));
    let target = directory.join("target.txt");
    let link = directory.join("link.txt");
    fs::create_dir(&directory).unwrap();
    fs::write(&target, b"atlas").unwrap();
    symlink("target.txt", &link).unwrap();

    let entry = fs::read_dir(&directory)
        .unwrap()
        .map(Result::unwrap)
        .find(|entry| entry.file_name() == "link.txt")
        .unwrap();
    let entry_is_link = entry.metadata().unwrap().file_type().is_symlink();
    let destination_is_file = fs::metadata(entry.path()).unwrap().is_file();

    fs::remove_file(&link).unwrap();
    fs::remove_file(&target).unwrap();
    fs::remove_dir(&directory).unwrap();

    assert!(entry_is_link);
    assert!(destination_is_file);
}
