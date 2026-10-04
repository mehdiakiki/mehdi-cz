use std::io::{Cursor, Read};

fn main() {
    let mut output = String::from("prefix:");
    output.clear();
    Cursor::new("payload").read_to_string(&mut output).unwrap();

    assert_eq!(output, "payload");
}
