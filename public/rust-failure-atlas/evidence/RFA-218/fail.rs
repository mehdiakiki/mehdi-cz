fn main() {
    let values = [1, 2, 3, 4, 5];
    let visited = values
        .chunks_exact(2)
        .flatten()
        .copied()
        .collect::<Vec<_>>();

    assert_eq!(
        visited, values,
        "slice::chunks_exact omits a short remainder from iteration"
    );
}
