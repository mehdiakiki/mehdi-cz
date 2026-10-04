use std::{os::unix::process::ExitStatusExt, process::Command};

fn main() {
    if std::env::args().any(|argument| argument == "--abort-child") {
        std::process::abort();
    }

    let status = Command::new(std::env::current_exe().unwrap())
        .arg("--abort-child")
        .status()
        .unwrap();

    assert!(!status.success());
    assert_eq!(status.code(), None);
    assert!(status.signal().is_some());
}
