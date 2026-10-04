use std::io::{Cursor, Read, Write};

trait ReadWrite: Read + Write {}
impl<T: Read + Write + ?Sized> ReadWrite for T {}

fn use_duplex(stream: &mut dyn ReadWrite) {
    stream.write_all(b"ok").unwrap();
}

fn main() {
    let mut stream = Cursor::new(Vec::new());
    use_duplex(&mut stream);
    assert_eq!(stream.into_inner(), b"ok");
}
