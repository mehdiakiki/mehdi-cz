trait Checksum {
    fn checksum(&self) -> u8;
}

impl Checksum for Vec<u8> {
    fn checksum(&self) -> u8 {
        self.iter().fold(0, |sum, byte| sum.wrapping_add(*byte))
    }
}

fn main() {
    assert_eq!(vec![1, 2, 3].checksum(), 6);
}
