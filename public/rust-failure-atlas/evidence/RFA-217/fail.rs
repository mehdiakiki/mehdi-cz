use std::ffi::OsStr;
use std::path::Path;

fn main() {
    let dotfile_extension = Path::new(".env").extension();
    let archive_extension = Path::new("archive.tar.gz").extension();

    assert_eq!(
        (dotfile_extension, archive_extension),
        (Some(OsStr::new("env")), Some(OsStr::new("tar.gz"))),
        "Path::extension ignores a lone leading dot and returns only the final suffix"
    );
}
