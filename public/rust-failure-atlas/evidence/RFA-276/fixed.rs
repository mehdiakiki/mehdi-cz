use std::fs::OpenOptions;

fn main() -> std::io::Result<()> {
    let path = std::env::temp_dir().join(format!("rfa-276-{}.txt", std::process::id()));
    let _ = std::fs::remove_file(&path);

    let file = OpenOptions::new().read(true).write(true).create(true).open(&path)?;
    assert!(file.metadata()?.is_file());
    drop(file);
    std::fs::remove_file(path)
}
