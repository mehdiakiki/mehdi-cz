#[cfg(unix)]
fn main() {
    use std::fs;
    use std::os::unix::fs::symlink;

    let path = std::env::temp_dir().join(format!("rfa-180-loop-{}", std::process::id()));
    let _ = fs::remove_file(&path);
    symlink(&path, &path).unwrap();
    let detailed = path.try_exists();

    assert!(
        path.exists(),
        "Path::exists coerces an indeterminate filesystem error to false: {detailed:?}"
    );
}

#[cfg(not(unix))]
fn main() {
    compile_error!("RFA-180 is a Unix symlink fixture");
}
