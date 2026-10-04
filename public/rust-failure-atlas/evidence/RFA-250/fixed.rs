fn chunks_for(values: &[u8], chunk_size: usize) -> Option<Vec<&[u8]>> {
    (chunk_size != 0).then(|| values.chunks(chunk_size).collect())
}

fn main() {
    assert_eq!(chunks_for(&[1, 2, 3], 0), None);
    assert_eq!(chunks_for(&[1, 2, 3], 2), Some(vec![&[1, 2][..], &[3][..]]));
}
