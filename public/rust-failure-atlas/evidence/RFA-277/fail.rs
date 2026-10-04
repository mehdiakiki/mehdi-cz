use std::io::Read;

fn main() -> std::io::Result<()> {
    let mut limited = (&b"abcdef"[..]).take(4);
    let mut first = [0_u8; 3];
    limited.read_exact(&mut first)?;

    let mut second = [0_u8; 3];
    let count = limited.read(&mut second)?;
    assert_eq!(count, 3, "Read::take applies one cumulative byte budget across calls, not a fresh limit to every read");
    Ok(())
}
