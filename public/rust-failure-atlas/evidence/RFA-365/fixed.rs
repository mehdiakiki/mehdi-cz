use std::env;
use std::io::{Read, Write};
use std::process::{Command, Stdio};

fn main() {
    if env::args_os().nth(1).as_deref() == Some(std::ffi::OsStr::new("--child")) {
        let mut input = Vec::new();
        std::io::stdin().read_to_end(&mut input).unwrap();
        assert_eq!(input, b"complete request");
        return;
    }

    let mut child = Command::new(env::current_exe().unwrap())
        .arg("--child")
        .stdin(Stdio::piped())
        .spawn()
        .unwrap();

    child.stdin.as_mut().unwrap().write_all(b"complete request").unwrap();
    drop(child.stdin.take());

    let status = child.wait().unwrap();
    assert!(status.success());
    assert!(child.stdin.is_none());
}
