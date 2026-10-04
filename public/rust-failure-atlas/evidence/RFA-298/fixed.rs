use std::io::{self, Read, Write};
use std::process::{Command, Stdio};

fn main() {
    if std::env::args().nth(1).as_deref() == Some("--read-stdin") {
        let mut input = String::new();
        io::stdin().read_to_string(&mut input).unwrap();
        print!("{input}");
        return;
    }

    let mut child = Command::new(std::env::current_exe().unwrap())
        .arg("--read-stdin")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect("child process starts");

    child
        .stdin
        .take()
        .expect("piped stdin handle")
        .write_all(b"payload")
        .unwrap();

    let output = child.wait_with_output().unwrap();
    assert!(output.status.success());
    assert_eq!(output.stdout, b"payload");
}
