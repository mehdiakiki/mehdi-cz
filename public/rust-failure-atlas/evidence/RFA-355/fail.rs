use std::io::{BufReader, Cursor};

fn main() {
    let source = Cursor::new(b"ready".to_vec());
    let reader = BufReader::new(source);

    assert!(
        !reader.buffer().is_empty(),
        "BufReader::buffer only observes bytes already buffered; construction does not fill it"
    );
}
