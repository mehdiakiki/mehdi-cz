use std::ffi::c_int;

pub extern "C" fn count_only(count: c_int, _args: ...) -> c_int {
    count
}
