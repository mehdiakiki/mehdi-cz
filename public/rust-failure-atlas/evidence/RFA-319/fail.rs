use std::process::Command;

fn main() {
    if std::env::args().any(|argument| argument == "--abort-child") {
        std::process::abort();
    }

    let status = Command::new(std::env::current_exe().unwrap())
        .arg("--abort-child")
        .status()
        .unwrap();

    assert_eq!(
        status.code(),
        Some(134),
        "ExitStatus::code returns None on Unix when a child is terminated by a signal"
    );
}
