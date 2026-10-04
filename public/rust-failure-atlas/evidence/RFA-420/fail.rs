trait Encode {
    fn encode<T>(value: T) -> usize;
}

struct Wire;

impl Encode for Wire {
    fn encode<T: Copy>(_value: T) -> usize {
        1
    }
}

fn main() {}
