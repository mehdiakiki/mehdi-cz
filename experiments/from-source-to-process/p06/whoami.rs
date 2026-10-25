use std::ffi::{CString, c_char, c_void};

unsafe extern "C" {
    fn getpwnam(name: *const c_char) -> *mut c_void;
}

fn main() {
    let name = std::env::args().nth(1).unwrap_or_else(|| "root".to_string());
    let c_name = CString::new(name.clone()).unwrap();
    let found = unsafe { !getpwnam(c_name.as_ptr()).is_null() };
    println!("{name}: {}", if found { "found" } else { "no such user" });
}
