use std::ffi::c_int;

pub unsafe extern "sysv64" fn count_only(count: c_int, _args: ...) -> c_int {
    count
}
