use std::ffi::c_int;

pub unsafe extern "C" fn count_only(count: c_int, ...) -> c_int {
    count
}
