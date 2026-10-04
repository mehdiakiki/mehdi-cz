use std::{cell::UnsafeCell, mem::size_of, ptr::NonNull};

fn main() {
    assert_eq!(
        size_of::<Option<UnsafeCell<NonNull<u8>>>>(),
        size_of::<Option<NonNull<u8>>>(),
        "wrapping NonNull in UnsafeCell disables the outer Option niche optimization"
    );
}
