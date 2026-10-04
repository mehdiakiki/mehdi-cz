fn next_chunk_stable<I, const N: usize>(values: &mut I) -> Result<[I::Item; N], Vec<I::Item>>
where
    I: Iterator,
{
    let partial = values.take(N).collect::<Vec<_>>();
    if partial.len() == N {
        Ok(partial.try_into().ok().unwrap())
    } else {
        Err(partial)
    }
}

fn main() {
    let mut values = [10, 20].into_iter();
    assert_eq!(next_chunk_stable::<_, 3>(&mut values), Err(vec![10, 20]));
    assert_eq!(values.next(), None);

    let mut enough = [1, 2, 3, 4].into_iter();
    assert_eq!(next_chunk_stable::<_, 3>(&mut enough), Ok([1, 2, 3]));
    assert_eq!(enough.next(), Some(4));
}
