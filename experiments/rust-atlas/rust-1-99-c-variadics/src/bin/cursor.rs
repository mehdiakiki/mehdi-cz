use std::ffi::{c_double, c_int};

unsafe extern "C" fn show_cursor(count: c_int, mut args: ...) {
    println!("count = {count}");
    println!("{:<20}{args:?}", "start:");
    let number = unsafe { args.next_arg::<c_int>() };
    println!("{:<20}{args:?}", format!("after c_int {number}:"));
    let real = unsafe { args.next_arg::<c_double>() };
    println!("{:<20}{args:?}", format!("after c_double {real}:"));
}

fn main() {
    unsafe { show_cursor(2, 7 as c_int, 2.5 as c_double) };
}
