use std::io::{self, Read};
use std::process::Command;

fn main() {
    if std::env::args().nth(1).as_deref() == Some("--read-stdin") {
        let mut input = String::new();
        io::stdin().read_to_string(&mut input).unwrap();
        print!("{input}");
        return;
    }

    let output = Command::new(std::env::current_exe().unwrap())
        .arg("--read-stdin")
        .output()
        .expect("child process starts");

    assert_eq!(
        output.stdout,
        b"payload",
        "Command::output closes child stdin by default instead of inheriting the parent's input"
    );
}
