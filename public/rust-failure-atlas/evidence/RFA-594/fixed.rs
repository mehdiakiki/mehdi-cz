fn main() {
    let address = 0_usize as *const u8;
    assert!(address.is_null());
}
