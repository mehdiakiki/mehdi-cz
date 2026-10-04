fn main() {
    let values = [1, 2, 3, 4, 5];
    let chunks = values.chunks_exact(2);
    let remainder = chunks.remainder();
    let visited = chunks
        .flatten()
        .chain(remainder.iter())
        .copied()
        .collect::<Vec<_>>();

    assert_eq!(visited, values);
    assert_eq!(remainder, [5]);
}
