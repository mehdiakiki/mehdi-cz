use std::ffi::{CStr, c_char};

unsafe extern "C" {
    fn getauxval(kind: u64) -> u64;
}

const AT_EXECFN: u64 = 31;

fn main() {
    let first = std::env::args().next().unwrap();
    let execfn = unsafe { getauxval(AT_EXECFN) } as *const c_char;
    let local = 0u8;
    println!("std::env::args() first: {first:?} at {:p}", first.as_ptr());
    println!("AT_EXECFN:              {:?} at {execfn:p}", unsafe { CStr::from_ptr(execfn) });
    println!("a local of main:        {:p}", &local);
    let maps = std::fs::read_to_string("/proc/self/maps").unwrap();
    for line in maps.lines().filter(|l| l.ends_with("[heap]") || l.ends_with("[stack]")) {
        println!("{line}");
    }
}
