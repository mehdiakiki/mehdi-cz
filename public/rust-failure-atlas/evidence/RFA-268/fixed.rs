use std::path::{Component, Path};

fn main() {
    let components: Vec<_> = Path::new("a/./b/../c").components().collect();
    assert!(!components.contains(&Component::CurDir));
    assert!(components.contains(&Component::ParentDir));
}
