use std::path::{Path, PathBuf};

fn join_relative(root: &Path, candidate: &Path) -> Result<PathBuf, &'static str> {
    if candidate.is_absolute() {
        return Err("absolute paths are not accepted");
    }
    Ok(root.join(candidate))
}

fn main() {
    let root = Path::new("/srv/application");
    let candidate = Path::new("/etc/passwd");

    assert_eq!(
        join_relative(root, candidate),
        Err("absolute paths are not accepted")
    );
}
