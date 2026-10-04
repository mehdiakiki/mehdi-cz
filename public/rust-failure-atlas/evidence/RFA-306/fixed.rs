use std::{ffi::OsString, process::Command};

fn configured_args(command: &Command) -> Vec<OsString> {
    command.get_args().map(OsString::from).collect()
}

fn command_for(argument: &str) -> Command {
    let mut command = Command::new("tool");
    command.arg(argument);
    command
}

fn main() {
    let first = command_for("first");
    let second = command_for("second");

    assert_eq!(configured_args(&first), ["first"]);
    assert_eq!(configured_args(&second), ["second"]);
}
