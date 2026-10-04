#[cfg(unix)]
fn main() {
    use std::fs;
    use std::os::unix::fs::symlink;

    let root = std::env::temp_dir().join(format!("rfa-346-fail-{}", std::process::id()));
    fs::create_dir(&root).unwrap();
    let target = root.join("target.txt");
    let link = root.join("alias.txt");
    fs::write(&target, b"atlas").unwrap();
    symlink("target.txt", &link).unwrap();
    let stored = fs::read_link(&link).unwrap();
    fs::remove_file(&link).unwrap();
    fs::remove_file(&target).unwrap();
    fs::remove_dir(&root).unwrap();

    assert_eq!(
        stored,
        target,
        "read_link returns the stored relative target, not an absolute resolved path"
    );
}

#[cfg(not(unix))]
fn main() {}
