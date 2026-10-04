#[cfg(unix)]
fn main() {
    use std::fs;
    use std::os::unix::fs::symlink;

    let root = std::env::temp_dir().join(format!("rfa-346-fixed-{}", std::process::id()));
    fs::create_dir(&root).unwrap();
    let target = root.join("target.txt");
    let link = root.join("alias.txt");
    fs::write(&target, b"atlas").unwrap();
    symlink("target.txt", &link).unwrap();

    let stored = fs::read_link(&link).unwrap();
    assert_eq!(stored, std::path::Path::new("target.txt"));
    let resolved = link.parent().unwrap().join(stored);
    assert_eq!(fs::canonicalize(resolved).unwrap(), fs::canonicalize(&target).unwrap());

    fs::remove_file(&link).unwrap();
    fs::remove_file(&target).unwrap();
    fs::remove_dir(&root).unwrap();
}

#[cfg(not(unix))]
fn main() {}
