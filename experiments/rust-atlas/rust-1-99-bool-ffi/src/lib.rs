#[unsafe(no_mangle)]
pub unsafe extern "C" fn rust_fn_returning_bool(flags: u8) -> bool {
    (flags & 0x1) == 0x1
}

#[unsafe(no_mangle)]
pub extern "C" fn rust_fn_returning_bool_u32(word: u32) -> bool {
    (word & 0x1) == 0x1
}

#[unsafe(no_mangle)]
pub extern "C" fn rust_fn_returning_u8(flags: u8) -> u8 {
    u8::from((flags & 0x1) == 0x1)
}
