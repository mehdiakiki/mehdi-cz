use std::io::{Cursor, Read};

fn main() {
    let mut output = String::from("prefix:");
    Cursor::new("payload").read_to_string(&mut output).unwrap();

    assert_eq!(
        output,
        "payload",
        "read_to_string appends to the destination instead of replacing it"
    );
}
