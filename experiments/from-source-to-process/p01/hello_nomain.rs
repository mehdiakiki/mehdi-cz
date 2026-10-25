#![no_main]

use std::io::Write;

#[unsafe(no_mangle)]
pub extern "C" fn main(_argc: i32, _argv: *const *const u8) -> i32 {
    std::io::stdout().write_all(b"hello from Rust\n").unwrap();
    0
}
