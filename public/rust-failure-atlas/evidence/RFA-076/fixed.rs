fn main() {
    let text: &str = "atlas";
    let address = text.as_ptr() as usize;
    assert_ne!(address, 0);
}
