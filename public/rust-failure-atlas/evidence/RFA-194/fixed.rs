use std::path::Path;

fn main() {
    let sibling = Path::new("/srv/application-cache");
    let child = Path::new("/srv/application/cache");

    assert!(!sibling.starts_with("/srv/application"));
    assert!(child.starts_with("/srv/application"));
}
