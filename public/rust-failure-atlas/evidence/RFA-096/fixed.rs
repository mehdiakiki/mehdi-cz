unsafe extern "C" fn read_status(pointer: *const i32) -> i32 {
    // Safety: callers must provide a valid pointer to one initialized i32.
    unsafe { *pointer }
}

fn main() {
    let status = 7;
    // Safety: this pointer comes from a live, aligned reference to status.
    let read = unsafe { read_status(&status) };
    assert_eq!(read, 7);
}
