// Calls printf through its variadic C declaration.
#![no_std]

use core::ffi::{c_char, c_int};

unsafe extern "C" {
    fn printf(format: *const c_char, ...) -> c_int;
}

#[unsafe(no_mangle)]
pub fn print_value(value: c_int) -> c_int {
    unsafe { printf(c"%d\n".as_ptr(), value) }
}
