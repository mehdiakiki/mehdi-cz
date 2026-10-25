use std::ffi::c_int;

pub unsafe extern "C" fn first(args: ...) -> c_int {
    unsafe { args.next_arg::<c_int>() }
}
