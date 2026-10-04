fn main() {
    let small = 1_u32;
    let converted: u64 = small.into();
    let large = 2_u64 + converted;
    assert_eq!(large, 3);
}
