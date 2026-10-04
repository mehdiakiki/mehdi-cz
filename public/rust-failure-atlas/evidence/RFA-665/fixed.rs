fn main() {
    let mut input = [1, 2, 3, 4, 5];
    let mut chunks = input.chunks_exact_mut(2);
    for chunk in &mut chunks {
        for value in chunk {
            *value += 10;
        }
    }
    for value in chunks.into_remainder() {
        *value += 10;
    }
    assert_eq!(input, [11, 12, 13, 14, 15]);
}
