use std::path::{Path, PathBuf};

fn main() {
    let root = PathBuf::from("/srv/application");
    let joined = root.join(Path::new("/etc/passwd"));

    assert!(
        joined.starts_with("/srv/application"),
        "joining an absolute path replaces the base path on this target"
    );
}
