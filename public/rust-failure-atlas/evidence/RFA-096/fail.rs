unsafe extern "C" fn read_status(pointer: *const i32) -> i32 {
    // Safety: callers must provide a valid pointer to one initialized i32.
    unsafe { *pointer }
}

fn main() {
    let status = 7;
    let _read = read_status(&status);
}
