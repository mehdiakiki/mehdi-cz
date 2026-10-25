use std::env;
use std::ffi::{CStr, c_double, c_int};

use varargs::{rv_format, rv_free, rv_sum};

fn main() {
    match env::args().nth(1).as_deref() {
        Some("wrong-type") => {
            let text = unsafe { rv_format(c"%d".as_ptr(), 2.5 as c_double) };
            let shown = unsafe { CStr::from_ptr(text) }.to_string_lossy().into_owned();
            unsafe { rv_free(text) };
            println!("rv_format(\"%d\", 2.5) = \"{shown}\"");
        }
        Some("short-count") => {
            let total = unsafe { rv_sum(4, 1 as c_int, 2 as c_int, 3 as c_int) };
            println!("rv_sum(4, 1, 2, 3) = {total}");
        }
        _ => {
            eprintln!("usage: misuse wrong-type|short-count");
            std::process::exit(2);
        }
    }
}
