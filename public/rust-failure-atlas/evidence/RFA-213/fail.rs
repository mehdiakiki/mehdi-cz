use std::fs;
use std::path::PathBuf;
use std::process::Command;

struct DropMarker(PathBuf);

impl Drop for DropMarker {
    fn drop(&mut self) {
        fs::write(&self.0, b"dropped").expect("write drop marker");
    }
}

fn main() -> std::io::Result<()> {
    let arguments = std::env::args_os().collect::<Vec<_>>();
    if arguments.get(1).is_some_and(|value| value == "child") {
        let _marker = DropMarker(PathBuf::from(&arguments[2]));
        std::process::exit(17);
    }

    let marker = std::env::temp_dir().join(format!("rfa-213-{}.txt", std::process::id()));
    let _ = fs::remove_file(&marker);
    let status = Command::new(std::env::current_exe()?)
        .arg("child")
        .arg(&marker)
        .status()?;
    assert_eq!(status.code(), Some(17));

    let destructor_ran = marker.exists();
    if destructor_ran {
        fs::remove_file(&marker)?;
    }
    assert!(
        destructor_ran,
        "process::exit skips destructors on the current stack"
    );
    Ok(())
}
