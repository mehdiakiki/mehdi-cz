use std::path::PathBuf;

fn main() {
    let mut path = PathBuf::from("archive.tar.gz");
    assert!(path.set_extension(""));

    assert_eq!(path.extension(), None, "removing the final extension can reveal an earlier dotted suffix as the new extension");
}
