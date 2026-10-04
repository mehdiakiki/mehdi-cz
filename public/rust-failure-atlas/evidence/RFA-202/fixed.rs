use std::fs::{self, OpenOptions};
use std::io::{Seek, SeekFrom};

fn main() -> std::io::Result<()> {
    let path = std::env::temp_dir().join(format!("rfa-202-fixed-{}.txt", std::process::id()));
    fs::write(&path, b"abcdef")?;

    let mut file = OpenOptions::new().read(true).write(true).open(&path)?;
    file.seek(SeekFrom::End(0))?;
    file.set_len(2)?;
    assert_eq!(file.stream_position()?, 6);

    file.seek(SeekFrom::Start(2))?;
    assert_eq!(file.stream_position()?, 2);

    drop(file);
    fs::remove_file(path)?;
    Ok(())
}
