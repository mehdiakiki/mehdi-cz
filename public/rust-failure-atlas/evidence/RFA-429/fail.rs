fn main() {
    let byte = 7_u8;
    let thin = &byte as *const u8;
    let _slice = thin as *const [u8];
}
