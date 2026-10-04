fn main() {
    let retries = 2_u8;
    retries = retries.saturating_add(1);
    assert_eq!(retries, 3);
}
