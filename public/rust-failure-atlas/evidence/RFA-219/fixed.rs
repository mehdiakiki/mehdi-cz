use std::fs::{self, File, OpenOptions};
use std::io;

fn main() -> std::io::Result<()> {
    let root = std::env::temp_dir().join(format!("rfa-219-fixed-{}", std::process::id()));
    fs::create_dir_all(&root)?;
    let source = root.join("source.txt");
    let destination = root.join("destination.txt");
    let fresh_destination = root.join("fresh.txt");
    fs::write(&source, b"new")?;
    fs::write(&destination, b"old")?;

    let mut source_file = File::open(&source)?;
    let destination_file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&destination);

    assert_eq!(
        destination_file.unwrap_err().kind(),
        io::ErrorKind::AlreadyExists
    );
    assert_eq!(fs::read(&destination)?, b"old");

    let mut fresh_file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&fresh_destination)?;
    assert_eq!(io::copy(&mut source_file, &mut fresh_file)?, 3);
    drop(fresh_file);
    assert_eq!(fs::read(&fresh_destination)?, b"new");
    fs::remove_dir_all(root)?;
    Ok(())
}
