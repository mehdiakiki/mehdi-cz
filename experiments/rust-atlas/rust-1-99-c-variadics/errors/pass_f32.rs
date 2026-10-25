use std::ffi::{c_double, c_int};

pub unsafe extern "C" fn first_double(_count: c_int, mut args: ...) -> c_double {
    unsafe { args.next_arg::<c_double>() }
}

pub fn call() -> c_double {
    let half: f32 = 0.5;
    unsafe { first_double(1, half) }
}
