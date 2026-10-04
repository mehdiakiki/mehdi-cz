use std::ffi::OsStr;
use std::path::Path;

fn main() {
    let dotfile = Path::new(".env");
    assert_eq!(dotfile.extension(), None);
    assert_eq!(dotfile.file_stem(), Some(OsStr::new(".env")));

    let archive = Path::new("archive.tar.gz");
    assert_eq!(archive.extension(), Some(OsStr::new("gz")));
    assert_eq!(archive.file_stem(), Some(OsStr::new("archive.tar")));
}
