fn main() {
    let mut input = [1, 2, 3, 4, 5];
    let mut chunks = input.chunks_exact_mut(2);
    for chunk in &mut chunks {
        for value in chunk {
            *value += 10;
        }
    }
    let remainder = chunks.into_remainder();
    assert!(remainder.is_empty(),
        "chunks_exact_mut keeps a mutable incomplete tail outside iteration");
}
