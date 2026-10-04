fn main() {
    let retries: u8 = 2;
    let next = retries.saturating_add(1);
    assert_eq!(next, 3);
}
