use std::path::Path;

fn main() {
    let parent = Path::new("config.toml").parent();
    assert_eq!(parent, Some(Path::new("")));

    let directory = parent
        .filter(|path| !path.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));
    assert_eq!(directory, Path::new("."));
}
