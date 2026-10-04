use std::path::{Component, Path};

fn main() {
    let has_parent = Path::new("a/./b/../c")
        .components()
        .any(|component| component == Component::ParentDir);
    assert!(!has_parent, "Path::components removes current-directory markers but preserves parent-directory components");
}
