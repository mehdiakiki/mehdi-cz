use std::fs::{self, OpenOptions};
use std::io::{Seek, SeekFrom, Write};

fn main() -> std::io::Result<()> {
    let path = std::env::temp_dir().join(format!("rfa-203-fixed-{}.txt", std::process::id()));
    fs::write(&path, b"abc")?;

    let mut file = OpenOptions::new().read(true).write(true).open(&path)?;
    file.seek(SeekFrom::Start(0))?;
    file.write_all(b"X")?;
    drop(file);

    let contents = fs::read(&path)?;
    fs::remove_file(path)?;
    assert_eq!(contents, b"Xbc");
    Ok(())
}
