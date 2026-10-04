#[cfg(unix)]
fn main() {
    use std::fs;
    use std::os::unix::fs::symlink;

    let path = std::env::temp_dir().join(format!("rfa-180-fixed-loop-{}", std::process::id()));
    let _ = fs::remove_file(&path);
    symlink(&path, &path).unwrap();

    let result = path.try_exists();
    assert!(result.is_err());
    fs::remove_file(path).unwrap();
}

#[cfg(not(unix))]
fn main() {
    compile_error!("RFA-180 is a Unix symlink fixture");
}
