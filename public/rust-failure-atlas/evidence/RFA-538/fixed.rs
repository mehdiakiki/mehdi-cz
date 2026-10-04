fn main() {
    let configured_retries = 2_u8;
    let effective_retries = configured_retries.saturating_add(1);

    assert_eq!(configured_retries, 2);
    assert_eq!(effective_retries, 3);
}
