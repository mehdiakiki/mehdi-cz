use std::path::Path;

fn main() {
    let parent = Path::new("config.toml").parent();

    assert_eq!(
        parent, None,
        "Path::parent returns Some(empty path) for a one-component relative path"
    );
}
