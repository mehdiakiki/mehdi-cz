use std::fs;

fn main() -> std::io::Result<()> {
    let root = std::env::temp_dir().join(format!("rfa-219-{}", std::process::id()));
    fs::create_dir_all(&root)?;
    let source = root.join("source.txt");
    let destination = root.join("destination.txt");
    fs::write(&source, b"new")?;
    fs::write(&destination, b"old")?;

    fs::copy(&source, &destination)?;
    let contents = fs::read(&destination)?;
    fs::remove_dir_all(root)?;

    assert_eq!(
        contents, b"old",
        "fs::copy overwrites an existing destination file"
    );
    Ok(())
}
