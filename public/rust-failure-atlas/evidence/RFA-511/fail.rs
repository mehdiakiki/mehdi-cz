impl Vec<u8> {
    fn checksum(&self) -> u8 {
        self.iter().fold(0, |sum, byte| sum.wrapping_add(*byte))
    }
}

fn main() {}
