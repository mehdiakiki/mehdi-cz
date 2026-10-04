fn advance_by_stable<I: Iterator>(values: &mut I, requested: usize) -> Result<(), usize> {
    for completed in 0..requested {
        if values.next().is_none() {
            return Err(requested - completed);
        }
    }
    Ok(())
}

fn main() {
    let mut values = [10, 20].into_iter();
    assert_eq!(advance_by_stable(&mut values, 5), Err(3));
    assert_eq!(values.next(), None);

    let mut exact = [1, 2, 3].into_iter();
    assert_eq!(advance_by_stable(&mut exact, 2), Ok(()));
    assert_eq!(exact.next(), Some(3));
}
