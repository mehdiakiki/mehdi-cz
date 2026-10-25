use std::ffi::{CStr, c_char, c_double, c_int, c_long, c_uint};
use std::ptr;

use varargs::{rv_cformat, rv_format, rv_free, rv_join_path, rv_mean, rv_sum, rv_sum_array, rv_vsum};

unsafe extern "C" fn forward_sum(count: c_int, args: ...) -> c_long {
    unsafe { rv_vsum(count, args) }
}

fn print_text(label: &str, text: *mut c_char) {
    let shown = unsafe { CStr::from_ptr(text) }.to_string_lossy().into_owned();
    unsafe { rv_free(text) };
    println!("{label} = \"{shown}\"");
}

fn main() {
    let letter = b'A';
    let small: i16 = 7;
    let half: f32 = 0.5;
    let values: [c_int; 3] = [10, 20, 12];

    println!("count:     rv_sum(3, 10, 20, 12) = {}", unsafe {
        rv_sum(3, 10 as c_int, 20 as c_int, 12 as c_int)
    });
    println!("promoted:  rv_sum(2, letter, small) = {}", unsafe {
        rv_sum(2, c_int::from(letter), c_int::from(small))
    });
    println!("promoted:  rv_mean(3, half, 1.5f, 4.0f) = {:.6}", unsafe {
        rv_mean(3, c_double::from(half), 1.5 as c_double, 4.0 as c_double)
    });
    print_text(
        "sentinel:  rv_join_path(\"usr\", \"local\", \"bin\", NULL)",
        unsafe {
            rv_join_path(
                c"usr".as_ptr(),
                c"local".as_ptr(),
                c"bin".as_ptr(),
                ptr::null::<c_char>(),
            )
        },
    );
    print_text(
        "format:    rv_format(\"%s: %d jobs, %u%% done, grade %c, avg %f\", ...)",
        unsafe {
            rv_format(
                c"%s: %d jobs, %u%% done, grade %c, avg %f".as_ptr(),
                c"queue".as_ptr(),
                3 as c_int,
                75 as c_uint,
                c_int::from(letter),
                c_double::from(half),
            )
        },
    );
    print_text(
        "forwarded: rv_cformat(\"%-6s|%5.2f|%#x\", \"load\", 9.87654, 255)",
        unsafe {
            rv_cformat(
                c"%-6s|%5.2f|%#x".as_ptr(),
                c"load".as_ptr(),
                9.87654 as c_double,
                255 as c_int,
            )
        },
    );
    println!("va_list:   forward_sum(4, 1, 2, 3, 4) -> rv_vsum = {}", unsafe {
        forward_sum(4, 1 as c_int, 2 as c_int, 3 as c_int, 4 as c_int)
    });
    println!("typed:     rv_sum_array(values, 3) = {}", unsafe {
        rv_sum_array(values.as_ptr(), values.len())
    });
}
