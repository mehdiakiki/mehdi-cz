fn main() {
    assert_eq!(
        0_u32.pow(0),
        0,
        "integer pow defines the zero exponent result as one, including zero to zero"
    );
}
