struct Resumable {
    step: u8,
}

impl Iterator for Resumable {
    type Item = u8;

    fn next(&mut self) -> Option<Self::Item> {
        let value = match self.step {
            0 => Some(1),
            1 => None,
            2 => Some(2),
            _ => None,
        };
        self.step += 1;
        value
    }
}

fn main() {
    let mut values = Resumable { step: 0 }.fuse();
    assert_eq!(values.next(), Some(1));
    assert_eq!(values.next(), None);
    assert_eq!(
        values.next(),
        Some(2),
        "Fuse makes the first None permanent, even if the source iterator could resume"
    );
}
