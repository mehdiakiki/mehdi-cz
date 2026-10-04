#[no_mangle]
pub fn bump(age: u8) -> u8 {
    age + 1
}

#[no_mangle]
pub fn bump_wide(age: u32) -> u32 {
    age + 1
}
