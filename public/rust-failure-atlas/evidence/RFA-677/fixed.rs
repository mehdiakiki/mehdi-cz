use std::path::Path;

fn main() {
    let path = Path::new("archive.tar.gz");
    let name = path.file_name().and_then(|name| name.to_str()).unwrap();
    let compound = name.strip_prefix("archive.").unwrap();
    assert_eq!(compound, "tar.gz");
    assert_eq!(path.extension().and_then(|part| part.to_str()), Some("gz"));
}
