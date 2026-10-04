struct Buffer<T, const CAPACITY: usize> {
    value: T,
}

fn main() {
    let buffer: Buffer<u8, 16> = Buffer { value: 7 };
    assert_eq!(buffer.value, 7);
}
