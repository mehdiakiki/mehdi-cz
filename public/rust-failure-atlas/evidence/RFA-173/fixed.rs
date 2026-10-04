use std::process::Command;

fn main() {
    let output = Command::new("sh").args(["-c", "exit 7"]).output().unwrap();

    assert!(!output.status.success());
    assert_eq!(output.status.code(), Some(7));
}
