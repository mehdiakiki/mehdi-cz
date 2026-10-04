use std::{cell::RefCell, io::{self, Seek, SeekFrom, Write}, rc::Rc};

struct Probe(Rc<RefCell<Vec<&'static str>>>);

impl Write for Probe {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        self.0.borrow_mut().push("write");
        Ok(bytes.len())
    }
    fn flush(&mut self) -> io::Result<()> { Ok(()) }
}

impl Seek for Probe {
    fn seek(&mut self, _: SeekFrom) -> io::Result<u64> {
        self.0.borrow_mut().push("seek");
        Ok(0)
    }
}

fn main() -> io::Result<()> {
    let events = Rc::new(RefCell::new(Vec::new()));
    let mut writer = io::BufWriter::with_capacity(8, Probe(Rc::clone(&events)));
    writer.write_all(b"x")?;
    assert!(events.borrow().is_empty());
    writer.seek(SeekFrom::Current(0))?;
    assert_eq!(&*events.borrow(), &["seek"], "BufWriter flushes buffered bytes before delegating a seek");
    Ok(())
}
