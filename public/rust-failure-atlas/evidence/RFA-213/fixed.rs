use std::fs;
use std::path::PathBuf;
use std::process::{Command, ExitCode};

struct DropMarker(PathBuf);

impl Drop for DropMarker {
    fn drop(&mut self) {
        fs::write(&self.0, b"dropped").expect("write drop marker");
    }
}

fn main() -> std::io::Result<ExitCode> {
    let arguments = std::env::args_os().collect::<Vec<_>>();
    if arguments.get(1).is_some_and(|value| value == "child") {
        let _marker = DropMarker(PathBuf::from(&arguments[2]));
        return Ok(ExitCode::from(17));
    }

    let marker = std::env::temp_dir().join(format!("rfa-213-fixed-{}.txt", std::process::id()));
    let _ = fs::remove_file(&marker);
    let status = Command::new(std::env::current_exe()?)
        .arg("child")
        .arg(&marker)
        .status()?;
    assert_eq!(status.code(), Some(17));
    assert_eq!(fs::read(&marker)?, b"dropped");
    fs::remove_file(marker)?;
    Ok(ExitCode::SUCCESS)
}
