use std::{cell::UnsafeCell, mem::size_of, ptr::NonNull};

fn main() {
    assert_eq!(size_of::<NonNull<u8>>(), size_of::<UnsafeCell<NonNull<u8>>>());
    assert_eq!(size_of::<Option<NonNull<u8>>>(), 8);
    assert_eq!(size_of::<Option<UnsafeCell<NonNull<u8>>>>(), 16);
}
