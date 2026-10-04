fn main() {
    let mut visited = Vec::new();
    let values: [usize; 4] = std::array::from_fn(|index| {
        visited.push(index);
        index * 10
    });
    assert_eq!(values, [0, 10, 20, 30]);
    assert_eq!(visited, vec![0, 1, 2, 3]);
}
