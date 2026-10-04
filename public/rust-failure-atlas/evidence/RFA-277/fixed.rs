use std::io::Read;

fn main() -> std::io::Result<()> {
    let mut limited = (&b"abcdef"[..]).take(4);
    let mut first = [0_u8; 3];
    limited.read_exact(&mut first)?;

    let mut second = [0_u8; 3];
    let count = limited.read(&mut second)?;
    assert_eq!(&first, b"abc");
    assert_eq!(count, 1);
    assert_eq!(&second[..count], b"d");
    assert_eq!(limited.limit(), 0);
    assert_eq!(limited.read(&mut second)?, 0);
    Ok(())
}
