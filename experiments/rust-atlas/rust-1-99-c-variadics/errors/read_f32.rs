use std::ffi::c_int;

pub unsafe extern "C" fn mean(count: c_int, mut args: ...) -> f32 {
    let mut total = 0.0;
    for _ in 0..count {
        total += unsafe { args.next_arg::<f32>() };
    }
    total / count as f32
}
