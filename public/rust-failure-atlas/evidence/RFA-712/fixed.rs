#[repr(align(16))]
struct OverAligned<T>(T);

fn unwrap_pointer<T: ?Sized>(value: OverAligned<*const T>) -> *const T {
    value.0
}

fn main() {
    let value = 7_u32;
    let pointer = unwrap_pointer(OverAligned(&value));
    assert_eq!(pointer, &value);
}
