trait Store {
    fn load(&self) -> u8;
}

struct Memory;

impl Store for Memory {
    fn load(&self) -> u8 { 7 }
}

impl Memory {
    fn save(&self, _value: u8) {}
}

fn main() {
    let memory = Memory;
    assert_eq!(memory.load(), 7);
    memory.save(8);
}
