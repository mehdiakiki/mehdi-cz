use std::{ffi::OsString, process::Command};

fn configured_args(command: &Command) -> Vec<OsString> {
    command.get_args().map(OsString::from).collect()
}

fn main() {
    let mut command = Command::new("tool");
    command.arg("first");
    assert_eq!(configured_args(&command), ["first"]);

    command.arg("second");
    assert_eq!(
        configured_args(&command),
        ["second"],
        "reusing a Command builder accumulates arguments instead of replacing the old configuration"
    );
}
