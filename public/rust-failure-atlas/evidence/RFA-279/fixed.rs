use std::path::{Path, PathBuf};

fn main() {
    let mut path = PathBuf::from("archive.tar.gz");
    while path.extension().is_some() {
        assert!(path.set_extension(""));
    }

    assert_eq!(path, Path::new("archive"));
    assert_eq!(path.extension(), None);
}
