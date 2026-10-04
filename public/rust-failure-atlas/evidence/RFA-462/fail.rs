trait Store {
    fn load(&self) -> u8;
}

struct Memory;

impl Store for Memory {
    fn load(&self) -> u8 { 7 }
    fn save(&self, _value: u8) {}
}

fn main() {}
