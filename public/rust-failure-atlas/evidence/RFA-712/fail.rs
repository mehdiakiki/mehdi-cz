use std::mem::transmute;

#[repr(align(16))]
struct OverAligned<T>(T);

fn unwrap_pointer<T: ?Sized>(value: OverAligned<*const T>) -> *const T {
    unsafe { transmute(value) }
}

fn main() {}
