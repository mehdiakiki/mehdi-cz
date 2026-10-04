#![deny(c_void_returns)]

use std::ffi::c_void;

pub unsafe extern "C" fn notify_host() -> c_void {
    loop {}
}

fn main() {}
