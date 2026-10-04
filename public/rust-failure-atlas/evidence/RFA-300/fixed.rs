use std::mem::size_of;

fn main() {
    let mut values: Vec<()> = Vec::with_capacity(8);
    let initial_capacity = values.capacity();

    values.extend(std::iter::repeat_n((), 1_000));

    assert_eq!(size_of::<()>(), 0);
    assert_eq!(initial_capacity, usize::MAX);
    assert_eq!(values.capacity(), usize::MAX);
    assert_eq!(values.len(), 1_000);
}
