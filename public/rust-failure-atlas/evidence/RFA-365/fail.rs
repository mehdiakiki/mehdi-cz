use std::env;
use std::io::Read;
use std::process::{Command, Stdio};

fn main() {
    if env::args_os().nth(1).as_deref() == Some(std::ffi::OsStr::new("--child")) {
        let mut input = Vec::new();
        std::io::stdin().read_to_end(&mut input).unwrap();
        return;
    }

    let mut child = Command::new(env::current_exe().unwrap())
        .arg("--child")
        .stdin(Stdio::piped())
        .spawn()
        .unwrap();

    assert!(child.stdin.is_some());
    let status = child.wait().unwrap();
    assert!(status.success());
    assert!(
        child.stdin.is_some(),
        "Child::wait takes and closes the piped stdin handle before blocking for process exit"
    );
}
