use std::process::Command;

fn main() {
    let output = Command::new("sh").args(["-c", "exit 7"]).output().unwrap();

    assert!(
        output.status.success(),
        "Command::output returns Ok even when the child exits with a non-zero status"
    );
}
