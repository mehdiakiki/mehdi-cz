fn main() {
    let product: u32 = std::iter::empty::<u32>().product();
    assert_eq!(product, 1);

    let no_factors: Option<u32> = std::iter::empty::<u32>().reduce(|left, right| left * right);
    assert_eq!(no_factors, None);
}
