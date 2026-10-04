fn indices<'a>(slice: &'a [u8]) -> impl Iterator<Item = usize> {
    slice.iter().enumerate().map(|(index, _)| index)
}

fn main() {
    let values = [10, 20];
    println!("{:?}", indices(&values).collect::<Vec<_>>());
}
