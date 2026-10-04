struct Buffer<T, const N: usize> {
    value: T,
}

fn main() {
    let buffer = Buffer::<u8, 4> { value: 7 };
    assert_eq!(buffer.value, 7);
}
