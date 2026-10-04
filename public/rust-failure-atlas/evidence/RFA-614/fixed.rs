type Numbers = dyn Iterator<Item = u32>;

fn drain(values: &mut Numbers) -> u32 {
    values.sum()
}

fn main() {
    let mut values = 1..=3;
    assert_eq!(drain(&mut values), 6);
}
