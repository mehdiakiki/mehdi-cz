fn main() {
    let owned = vec![1_u8, 2];
    let borrowed = &owned;

    let combined: Vec<_> = borrowed
        .iter()
        .copied()
        .chain(owned.iter().copied())
        .collect();

    assert_eq!(combined, [1, 2, 1, 2]);
}
