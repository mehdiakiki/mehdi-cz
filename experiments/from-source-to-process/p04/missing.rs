use std::ffi::c_char;

unsafe extern "C" {
    fn greet(name: *const c_char);
}

fn main() {
    unsafe { greet(c"rust".as_ptr()) };
}
