// Makes the type errors go away with casts: a pointer cast for puts, and an
// integer cast for labs declared with c_long.
use std::ffi::{CStr, c_int, c_long};

unsafe extern "C" {
    fn puts(s: *const i8) -> c_int;
    fn labs(x: c_long) -> c_long;
}

pub fn greet(name: &CStr) -> c_int {
    unsafe { puts(name.as_ptr() as *const i8) }
}

pub fn magnitude(x: i64) -> i64 {
    unsafe { labs(x as c_long) as i64 }
}

pub fn main() {
    let x = std::hint::black_box(-5_000_000_000);
    println!("{}: magnitude({x}) = {}", std::env::consts::ARCH, magnitude(x));
}
