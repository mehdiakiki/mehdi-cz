use std::path::Path;

fn main() {
    let extension = Path::new("archive.tar.gz").extension().unwrap();
    assert_eq!(extension, "tar.gz",
        "Path::extension returns only the final suffix after the last dot");
}
