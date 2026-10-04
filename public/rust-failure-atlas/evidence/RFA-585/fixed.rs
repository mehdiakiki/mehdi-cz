use std::ffi::{c_char, c_int};

unsafe extern "C" {
    fn printf(format: *const c_char, ...) -> c_int;
}

fn main() {
    unsafe {
        printf(c"%f\n".as_ptr(), 1.5_f64);
    }
}
