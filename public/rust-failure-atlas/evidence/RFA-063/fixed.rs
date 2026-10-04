fn indices<'a>(slice: &'a [u8]) -> impl Iterator<Item = usize> + use<'a> {
    slice.iter().enumerate().map(|(index, _)| index)
}

fn main() {
    let values = [10, 20];
    assert_eq!(indices(&values).collect::<Vec<_>>(), [0, 1]);
}
