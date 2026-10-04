use std::ptr::NonNull;

fn main() {
    let pointer = NonNull::<u64>::dangling();
    let address = pointer.as_ptr() as usize;
    assert_ne!(address, 0);
    assert_eq!(address % std::mem::align_of::<u64>(), 0);
}
