fn main() {
    let mut values = [1_u8, 3, 2, 4].into_iter();
    assert!(!values.by_ref().is_sorted());
    assert!(values.next().is_none(), "Iterator::is_sorted short-circuits at the first inversion and leaves a remainder");
}
