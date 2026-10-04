fn main() {
    let product: u32 = std::iter::empty::<u32>().product();
    assert_eq!(product, 0, "the product of an empty u32 iterator uses multiplicative identity one, not additive identity zero");
}
