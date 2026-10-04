use std::path::Path;

fn main() {
    let candidate = Path::new("/srv/application-cache");

    assert!(
        candidate.starts_with("/srv/application"),
        "Path::starts_with compares complete path components rather than textual prefixes"
    );
}
