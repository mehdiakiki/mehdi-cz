use std::io::{self, BufRead};

fn main() -> io::Result<()> {
    let input = io::Cursor::new(b"a,b,".as_slice());
    let fields = input.split(b',').collect::<io::Result<Vec<_>>>()?;
    assert_eq!(fields, [b"a".to_vec(), b"b".to_vec()]);
    Ok(())
}
