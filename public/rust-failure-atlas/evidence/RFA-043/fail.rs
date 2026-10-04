use std::ffi::c_void;

#[link(name = "rfa_native_v1", kind = "static")]
unsafe extern "C" {
    fn rfa_native_v1_create(value: i32) -> *mut c_void;
    fn rfa_native_v1_destroy(handle: *mut c_void);
}

#[link(name = "rfa_native_v2", kind = "static")]
unsafe extern "C" {
    fn rfa_native_v2_read(handle: *const c_void, value: *mut i32) -> i32;
}

fn main() {
    let handle = unsafe { rfa_native_v1_create(43) };
    assert!(!handle.is_null(), "native v1 allocation failed");

    let mut value = 0;
    let status = unsafe { rfa_native_v2_read(handle, &mut value) };
    unsafe { rfa_native_v1_destroy(handle) };

    eprintln!("linked native owners: v1 + v2; v2_read_status={status}");
    assert_eq!(status, 0, "owner mismatch: v1 handle reached v2");
}
