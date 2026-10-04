use std::fs::{self, OpenOptions};
use std::io::{Seek, SeekFrom};

fn main() -> std::io::Result<()> {
    let path = std::env::temp_dir().join(format!("rfa-202-{}.txt", std::process::id()));
    fs::write(&path, b"abcdef")?;

    let mut file = OpenOptions::new().read(true).write(true).open(&path)?;
    file.seek(SeekFrom::End(0))?;
    file.set_len(2)?;
    let position = file.stream_position()?;

    drop(file);
    fs::remove_file(path)?;

    assert_eq!(
        position, 2,
        "File::set_len leaves the cursor unchanged, even past the new end"
    );
    Ok(())
}
