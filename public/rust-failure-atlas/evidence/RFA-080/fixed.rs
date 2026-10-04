#![deny(unsafe_op_in_unsafe_fn)]

unsafe fn read(pointer: *const u8) -> u8 {
    // Safety: the caller must provide a valid, aligned pointer to one live u8.
    unsafe { *pointer }
}

fn main() {
    let value = 7_u8;
    // Safety: this pointer comes from a shared reference to `value`, which is still live.
    assert_eq!(unsafe { read(&value) }, 7);
}
