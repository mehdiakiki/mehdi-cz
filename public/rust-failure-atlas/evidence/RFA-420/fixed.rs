trait Encode {
    fn encode<T: Copy>(value: T) -> usize;
}

struct Wire;

impl Encode for Wire {
    fn encode<T: Copy>(_value: T) -> usize {
        1
    }
}

fn main() {
    assert_eq!(Wire::encode(7_u32), 1);
}
